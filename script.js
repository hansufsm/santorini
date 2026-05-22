/**
 * AMRTS Santorini Dashboard
 * Versão: 2.0 — Integração Convex
 * 
 * Arquitetura: Frontend estático (GitHub Pages) + Convex (banco em nuvem)
 * Os dados sensíveis (CSV) são importados via dashboard e persistidos no Convex.
 * O dashboard lê 100% do Convex em tempo real.
 */

// ─── CONFIGURAÇÃO DO CONVEX ───────────────────────────────────────────────────
const CONVEX_URL = "https://tough-kangaroo-90.convex.cloud";

// ─── CORES E CONSTANTES ───────────────────────────────────────────────────────
const colors = {
    primary: '#10b981',
    success: '#059669',
    danger:  '#ef4444',
    warning: '#f59e0b',
    slate:   '#94a3b8',
    silver:  '#C0C0C0',
    grid:    'rgba(16, 185, 129, 0.1)'
};

const MONTH_NAMES = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

// ─── ESTADO GLOBAL ────────────────────────────────────────────────────────────
let appState = {
    rawTransactions: [],
    filteredTransactions: [],
    summary: {
        totalReceived: 0,
        totalSent: 0,
        netBalance: 0,
        contributorsCount: 0,
        receivedCount: 0,
        sentCount: 0
    },
    pagination: { monthIndex: 0 }
};

// ─── CLIENTE CONVEX (HTTP API) ────────────────────────────────────────────────
const CONVEX_TIMEOUT_MS = 12_000; // 12 s — aborta se Convex não responder

/**
 * Fetch com timeout usando AbortController.
 * Trata HTTP errors E erros de aplicação Convex (status: "error").
 */
async function convexFetch(endpoint, functionPath, args = {}, timeoutMs = CONVEX_TIMEOUT_MS) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const response = await fetch(`${CONVEX_URL}/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: functionPath, args }),
            signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Convex ${endpoint} error (${functionPath}): ${err}`);
        }
        const data = await response.json();
        // Convex retorna HTTP 200 mesmo para erros de aplicação
        if (data.status === 'error') {
            throw new Error(data.errorMessage || `Erro em ${functionPath}`);
        }
        return data.value;
    } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
            throw new Error(`Timeout: ${functionPath} não respondeu em ${timeoutMs / 1000}s. Verifique o deploy do Convex.`);
        }
        throw err;
    }
}

/**
 * Executa uma query no Convex via HTTP API.
 */
async function convexQuery(functionPath, args = {}) {
    return convexFetch('query', functionPath, args);
}

/**
 * Executa uma mutation no Convex via HTTP API.
 */
async function convexMutation(functionPath, args = {}) {
    return convexFetch('mutation', functionPath, args);
}

/**
 * Mutation com timeout estendido — para operações de import em lote.
 */
async function convexMutationLong(functionPath, args = {}) {
    return convexFetch('mutation', functionPath, args, 120_000); // 2 min
}

// ─── UTILITÁRIOS DE DATA ──────────────────────────────────────────────────────

const parseDateParts = (dateStr) => {
    if (!dateStr) return null;
    const s = String(dateStr).trim();
    if (s.includes('/')) {
        const [day, month, year] = s.split('/');
        return { year: Number(year), month: Number(month), day: Number(day) };
    }
    const [year, month, day] = s.split('-');
    return { year: Number(year), month: Number(month), day: Number(day) };
};

const getMonthKey = (dateStr) => {
    const p = parseDateParts(dateStr);
    return p ? `${p.year}-${String(p.month).padStart(2, '0')}` : '';
};

const formatDateBR = (dateStr) => {
    const p = parseDateParts(dateStr);
    if (!p) return '—';
    return `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}/${p.year}`;
};

const formatMonthLabel = (ym) => {
    const [y, mm] = ym.split('-');
    return `${MONTH_NAMES[parseInt(mm, 10) - 1]} ${y}`;
};

const toSortableTimestamp = (dateStr, timeStr = '00:00:00') => {
    const p = parseDateParts(dateStr);
    if (!p) return 0;
    const [h = 0, m = 0, sec = 0] = String(timeStr || '00:00:00').split(':').map(Number);
    return new Date(p.year, p.month - 1, p.day, h, m, sec).getTime();
};

const formatCurrency = (value) => {
    if (isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const cleanName = (name) => {
    if (!name) return '';
    return name.replace(/^Pix\s+/i, '').replace(/^Pix/i, '').trim();
};

// Chave de dedup sem nome — permite reimportar CSV com nomes corrigidos sem duplicar.
const getTransactionKey = (t) =>
    `${t.date}|${t.time}|${t.value}|${t.detail}`.toLowerCase();

// ─── PARSE DE VALOR DO CSV ────────────────────────────────────────────────────

const parseValue = (valueStr) => {
    if (valueStr === undefined || valueStr === null) return 0;
    if (typeof valueStr === 'number') return valueStr;
    if (typeof valueStr !== 'string') return 0;
    const isNegative = valueStr.includes('-') || (valueStr.includes('(') && valueStr.includes(')'));
    let cleaned = valueStr.replace(/[^\d,.]/g, '');
    if (cleaned.includes(',') && cleaned.includes('.')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
        cleaned = cleaned.replace(',', '.');
    }
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return 0;
    return isNegative ? -Math.abs(parsed) : Math.abs(parsed);
};

// ─── PAGINAÇÃO ────────────────────────────────────────────────────────────────

const getAvailableMonths = (transactions) =>
    [...new Set(transactions.map(t => getMonthKey(t.date)).filter(Boolean))].sort().reverse();

const getViewMonth = () => {
    const months = getAvailableMonths(appState.filteredTransactions);
    if (!months.length) return null;
    const idx = Math.min(appState.pagination.monthIndex, months.length - 1);
    appState.pagination.monthIndex = idx;
    return months[idx];
};

const syncMonthSelect = () => {
    const month = getViewMonth();
    const monthSelect = document.getElementById('filter-month');
    if (monthSelect && month) monthSelect.value = month;
};

// ─── CARREGAMENTO DO CONVEX ───────────────────────────────────────────────────

/**
 * Carrega todas as transações do Convex e atualiza o estado global.
 */
async function loadFromConvex() {
    showLoading(true);
    try {
        const transactions = await convexQuery('transactions:getAllTransactions');
        appState.rawTransactions = transactions || [];
        appState.filteredTransactions = [...appState.rawTransactions];
        appState.pagination.monthIndex = 0;
        updateSummary();
        updateMonthFilter();
        renderDashboard();

        // Atualizar indicador
        const lastUpdate = document.getElementById('last-update');
        if (lastUpdate) {
            lastUpdate.textContent = `Convex · ${appState.rawTransactions.length} transações`;
        }
    } catch (err) {
        console.error('Erro ao carregar do Convex:', err);
        showConvexError(err.message);
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    const el = document.getElementById('loading-indicator');
    if (el) el.classList.toggle('hidden', !show);
}

function showConvexError(message) {
    const lastUpdate = document.getElementById('last-update');
    if (lastUpdate) {
        lastUpdate.innerHTML = `
            <span class="text-red-400 text-xs">⚠ ${message.includes('Timeout') ? 'Convex offline' : 'Erro Convex'}</span>
            <button onclick="loadFromConvex()" class="ml-2 text-xs text-emerald-400 underline hover:text-emerald-300">Tentar novamente</button>
        `;
    }
    // Garante que body.overflow nunca fica preso em erro
    document.body.style.overflow = '';
}

// ─── IMPORTAÇÃO CSV → CONVEX ──────────────────────────────────────────────────

/**
 * Processa CSV e envia as transações para o Convex via mutation.
 */
async function importCSVToConvex(csvData) {
    return new Promise((resolve, reject) => {
        Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.trim(),
            complete: async (results) => {
                try {
                    const transactions = results.data.map(item => {
                        const date  = item['Data']  || item['data']  || '';
                        const time  = item['Hora']  || item['hora']  || '00:00:00';
                        const type  = item['Tipo de transação'] || item['Tipo'] || '';
                        const name  = cleanName(item['Nome']  || item['nome']  || '');
                        const detail = item['Detalhe'] || item['detalhe'] || '';
                        const valueStr = item['Valor'] || item['valor'] || '0';
                        const value = parseValue(valueStr);
                        const transactionKey = getTransactionKey({ date, time, name, value, detail });

                        return { date, time, type, name, detail, value, originalValue: valueStr, transactionKey };
                    }).filter(t => t.date);

                    console.log(`Importando ${transactions.length} transações para o Convex...`);

                    // Envia em lotes de 50 para não estourar timeout nem limite de payload
                    const CHUNK = 50;
                    let inserted = 0, updated = 0, skipped = 0;
                    for (let i = 0; i < transactions.length; i += CHUNK) {
                        const chunk = transactions.slice(i, i + CHUNK);
                        const lote  = Math.floor(i / CHUNK) + 1;
                        const total = Math.ceil(transactions.length / CHUNK);
                        showToast(`Importando lote ${lote}/${total}…`, 'info', 3500);
                        const r = await convexMutationLong('transactions:importTransactions', { transactions: chunk });
                        inserted += r.inserted  || 0;
                        updated  += r.updated   || 0;
                        skipped  += r.skipped   || 0;
                    }

                    const result = { inserted, updated, skipped, total: transactions.length };
                    console.log(`Resultado: ${inserted} inseridas, ${updated} atualizadas, ${skipped} duplicatas.`);
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            },
            error: (err) => reject(err)
        });
    });
}

// ─── SUMMARY ─────────────────────────────────────────────────────────────────

function updateSummary() {
    const contributors = new Set();
    let received = 0, sent = 0, recCount = 0, sntCount = 0;

    appState.rawTransactions.forEach(t => {
        if (t.value > 0) {
            received += t.value;
            recCount++;
            if (t.detail === 'Recebido') contributors.add(t.name);
        } else {
            sent += Math.abs(t.value);
            sntCount++;
        }
    });

    appState.summary = {
        totalReceived: received,
        totalSent: sent,
        netBalance: received - sent,
        contributorsCount: contributors.size,
        receivedCount: recCount,
        sentCount: sntCount
    };
}

// ─── RENDER ───────────────────────────────────────────────────────────────────

function renderDashboard() {
    document.getElementById('total-received').textContent   = formatCurrency(appState.summary.totalReceived);
    document.getElementById('total-sent').textContent       = formatCurrency(appState.summary.totalSent);
    document.getElementById('net-balance').textContent      = formatCurrency(appState.summary.netBalance);
    document.getElementById('total-contributors').textContent = appState.summary.contributorsCount;
    document.getElementById('received-count').textContent   = appState.summary.receivedCount;
    document.getElementById('sent-count').textContent       = appState.summary.sentCount;
    renderCharts();
    renderTable();
}

function renderCharts() {
    // ── Fluxo Mensal ──
    const monthlyData = {};
    appState.rawTransactions.forEach(t => {
        const month = getMonthKey(t.date);
        if (!monthlyData[month]) monthlyData[month] = { received: 0, sent: 0 };
        if (t.value > 0) monthlyData[month].received += t.value;
        else monthlyData[month].sent += Math.abs(t.value);
    });

    const periodValue = document.getElementById('chart-period')?.value || '6';
    let labels = Object.keys(monthlyData).sort();
    if (periodValue !== 'all') labels = labels.slice(-parseInt(periodValue));

    let runningBalance = 0;
    const balanceValues = labels.map(l => {
        runningBalance += (monthlyData[l].received - monthlyData[l].sent);
        return runningBalance;
    });

    const ctxMonthly = document.getElementById('monthlyChart')?.getContext('2d');
    if (ctxMonthly) {
        if (window.monthlyChartInstance) window.monthlyChartInstance.destroy();
        window.monthlyChartInstance = new Chart(ctxMonthly, {
            type: 'bar',
            data: {
                labels: labels.map(l => {
                    const [y, m] = l.split('-');
                    const mn = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
                    return `${mn[parseInt(m)-1]}/${y}`;
                }),
                datasets: [
                    { label: 'Contribuições', data: labels.map(l => monthlyData[l].received), backgroundColor: colors.success, borderRadius: 4, order: 2 },
                    { label: 'Despesas',       data: labels.map(l => monthlyData[l].sent),     backgroundColor: colors.danger,  borderRadius: 4, order: 2 },
                    { label: 'Saldo Acumulado', data: balanceValues, type: 'line', borderColor: '#3b82f6', borderWidth: 2, fill: false, tension: 0.4, pointRadius: 3, order: 1 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: colors.grid }, ticks: { color: colors.slate, font: { size: 10 } } },
                    x: { grid: { display: false }, ticks: { color: colors.slate, font: { size: 10 } } }
                },
                plugins: { legend: { position: 'bottom', labels: { color: colors.slate, boxWidth: 10, usePointStyle: true, font: { size: 10 } } } }
            }
        });
    }

    // ── Rosca de Despesas ──
    const expenseCategories = {
        'Segurança e Monitoramento': 0,
        'Emolumentos e Taxas': 0,
        'Outros / Tarifas': 0
    };
    appState.rawTransactions.filter(t => t.value < 0).forEach(t => {
        const name = t.name.toLowerCase();
        const val  = Math.abs(t.value);
        if (name.includes('segurança') || name.includes('monitor') || name.includes('guarda') || name.includes('alarme'))
            expenseCategories['Segurança e Monitoramento'] += val;
        else if (name.includes('instituição') || name.includes('pagamento') || name.includes('taxa') || name.includes('emolumento'))
            expenseCategories['Emolumentos e Taxas'] += val;
        else
            expenseCategories['Outros / Tarifas'] += val;
    });

    const ctxDonut = document.getElementById('expensesDonutChart')?.getContext('2d');
    if (ctxDonut) {
        if (window.donutChartInstance) window.donutChartInstance.destroy();
        window.donutChartInstance = new Chart(ctxDonut, {
            type: 'doughnut',
            data: {
                labels: Object.keys(expenseCategories),
                datasets: [{ data: Object.values(expenseCategories), backgroundColor: ['#059669','#3b82f6','#f59e0b'], borderWidth: 0, hoverOffset: 10 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: colors.silver, boxWidth: 12, padding: 15, font: { size: 11 },
                            generateLabels: (chart) => {
                                const d = chart.data;
                                return d.labels.map((label, i) => {
                                    const val   = d.datasets[0].data[i];
                                    const total = d.datasets[0].data.reduce((a, b) => a + b, 0);
                                    const pct   = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                    return { text: `${label}: ${pct}%`, fillStyle: d.datasets[0].backgroundColor[i], fontColor: colors.silver, color: colors.silver, hidden: false, index: i };
                                });
                            }
                        }
                    }
                }
            }
        });
    }

    // ── Contribuintes Assíduos ──
    const contributorTotals = {};
    appState.rawTransactions.filter(t => t.value > 0 && t.detail === 'Recebido').forEach(t => {
        contributorTotals[t.name] = (contributorTotals[t.name] || 0) + t.value;
    });
    const top5 = Object.entries(contributorTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const ctxTop = document.getElementById('topContributorsChart')?.getContext('2d');
    if (ctxTop) {
        if (window.topChartInstance) window.topChartInstance.destroy();
        window.topChartInstance = new Chart(ctxTop, {
            type: 'bar',
            data: {
                labels: top5.map(([n]) => maskName(n)),
                datasets: [{ label: 'Contribuição acumulada', data: top5.map(t => t[1]), backgroundColor: colors.success, borderRadius: 4 }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { color: colors.grid }, ticks: { color: colors.slate, font: { size: 10 } } },
                    y: { grid: { display: false }, ticks: { color: colors.slate, font: { size: 10 } } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
}

// ─── PRIVACIDADE: ANONIMIZAÇÃO DE NOMES ──────────────────────────────────────
/** Número estável 1–max derivado do nome (mesmo nome → mesmo número). */
function _stableId(str, max) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = Math.imul(31, h) + str.charCodeAt(i) | 0; }
    return (Math.abs(h) % max) + 1;
}

/**
 * Mascara nomes para visitantes públicos.
 * - Admin vê sempre o nome completo.
 * - Portal do associado: o próprio nome fica visível, os demais são mascarados.
 * - Crédito (value >= 0): "Associado 042"
 * - Débito  (value <  0): "Despesa 07"
 *
 * @param {string}      name  – nome completo da transação
 * @param {string|null} own   – nome do associado logado no portal
 * @param {number}      value – valor da transação (determina o rótulo)
 */
function maskName(name, own = null, value = 1) {
    if (!name) return '—';
    if (sessionStorage.getItem('adminSession')) return name;
    if (own && name.trim().toLowerCase() === own.trim().toLowerCase()) return name;
    const key = name.trim().toLowerCase();
    if (value >= 0) return `Associado ${String(_stableId(key, 999)).padStart(3, '0')}`;
    return `Despesa ${String(_stableId(key, 99)).padStart(2, '0')}`;
}

function renderTable() {
    const tbody = document.getElementById('transactions-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const months = getAvailableMonths(appState.filteredTransactions);
    const currentMonth = getViewMonth();

    if (!currentMonth) {
        document.getElementById('showing-entries').textContent = 'Nenhuma transação encontrada';
        document.getElementById('prev-page').disabled = true;
        document.getElementById('next-page').disabled = true;
        return;
    }

    const txs = appState.filteredTransactions.filter(t => getMonthKey(t.date) === currentMonth);

    txs.forEach(t => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-800/50 transition-colors';
        row.innerHTML = `
            <td class="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-slate-400">
                ${formatDateBR(t.date)}<div class="text-[10px] opacity-50">${t.time}</div>
            </td>
            <td class="px-3 md:px-6 py-3 md:py-4">
                <div class="text-xs sm:text-sm font-medium text-slate-200">${maskName(t.name, null, t.value)}</div>
                <div class="text-[10px] text-slate-500 sm:hidden">${t.detail}</div>
            </td>
            <td class="px-3 md:px-6 py-3 md:py-4 hidden sm:table-cell">
                <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${t.value > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}">
                    ${t.detail}
                </span>
            </td>
            <td class="px-3 md:px-6 py-3 md:py-4 text-right whitespace-nowrap text-xs sm:text-sm font-mono ${t.value > 0 ? 'text-emerald-400' : 'text-red-400'}">
                ${t.value > 0 ? '+' : ''}${formatCurrency(t.value)}
            </td>
        `;
        tbody.appendChild(row);
    });

    if (txs.length > 0) {
        let totalR = 0, totalS = 0, cntR = 0, cntS = 0;
        txs.forEach(t => { if (t.value > 0) { totalR += t.value; cntR++; } else { totalS += Math.abs(t.value); cntS++; } });
        const net = totalR - totalS;
        const subtotalRow = document.createElement('tr');
        subtotalRow.className = 'bg-emerald-950/50 border-t-2 border-emerald-700/60';
        subtotalRow.innerHTML = `
            <td class="px-3 md:px-6 py-3 md:py-4 text-xs sm:text-sm font-bold text-emerald-300" colspan="2">Subtotais do mês</td>
            <td class="px-3 md:px-6 py-3 md:py-4 text-[10px] sm:text-xs text-emerald-500/90 space-y-1 hidden sm:table-cell">
                <div>Recebidos (${cntR})</div><div>Enviados (${cntS})</div>
                <div class="font-semibold text-emerald-300 pt-1 border-t border-emerald-800/40">Saldo</div>
            </td>
            <td class="px-3 md:px-6 py-3 md:py-4 text-right text-xs sm:text-sm font-mono font-semibold space-y-1">
                <div class="text-emerald-400">+${formatCurrency(totalR)}</div>
                <div class="text-red-400">−${formatCurrency(totalS)}</div>
                <div class="pt-1 border-t border-emerald-800/40 ${net >= 0 ? 'text-emerald-300' : 'text-red-400'}">${net >= 0 ? '+' : ''}${formatCurrency(net)}</div>
            </td>`;
        tbody.appendChild(subtotalRow);
    }

    const monthLabel = formatMonthLabel(currentMonth);
    document.getElementById('showing-entries').textContent =
        `${monthLabel} — ${txs.length} ${txs.length === 1 ? 'transação' : 'transações'}`;

    const dateRange = document.getElementById('date-range');
    if (dateRange) dateRange.textContent = monthLabel;

    document.getElementById('prev-page').disabled = appState.pagination.monthIndex >= months.length - 1;
    document.getElementById('next-page').disabled = appState.pagination.monthIndex === 0;
    syncMonthSelect();
}

function updateMonthFilter() {
    const monthSelect = document.getElementById('filter-month');
    if (!monthSelect) return;
    const months = getAvailableMonths(appState.filteredTransactions);
    const currentMonth = getViewMonth();
    monthSelect.innerHTML = '';
    months.forEach(m => {
        const option = document.createElement('option');
        option.value = m;
        option.textContent = formatMonthLabel(m);
        monthSelect.appendChild(option);
    });
    if (currentMonth) monthSelect.value = currentMonth;
}

function applyFilters(resetMonth = false) {
    const searchTerm  = document.getElementById('search-input')?.value.toLowerCase() || '';
    const typeFilter  = document.getElementById('filter-type')?.value || 'all';
    const monthSelect = document.getElementById('filter-month');
    const previousMonth = getViewMonth();

    appState.filteredTransactions = appState.rawTransactions.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchTerm) || t.type.toLowerCase().includes(searchTerm);
        const matchesType   = typeFilter === 'all' || t.detail === typeFilter;
        return matchesSearch && matchesType;
    });

    const months = getAvailableMonths(appState.filteredTransactions);
    if (resetMonth) {
        appState.pagination.monthIndex = 0;
    } else if (monthSelect?.value && months.includes(monthSelect.value)) {
        appState.pagination.monthIndex = months.indexOf(monthSelect.value);
    } else if (previousMonth && months.includes(previousMonth)) {
        appState.pagination.monthIndex = months.indexOf(previousMonth);
    } else {
        appState.pagination.monthIndex = 0;
    }

    updateMonthFilter();
    renderTable();
}

// ─── PORTAL DO ASSOCIADO ──────────────────────────────────────────────────────

function renderUserPortal(transactions, own = null) {
    const name  = own || transactions[0].name;   // nome real do associado, visível para ele próprio
    const total = transactions.reduce((acc, t) => acc + t.value, 0);
    const months = new Set(transactions.map(t => getMonthKey(t.date))).size;
    const lastDate = transactions[0].date;

    document.getElementById('portal-user-name').textContent  = name; // nome sem máscara no portal
    document.getElementById('portal-user-total').textContent = formatCurrency(total);
    document.getElementById('portal-user-months').textContent = months;
    document.getElementById('portal-user-last').textContent  = formatDateBR(lastDate);

    const tbody = document.getElementById('portal-user-table');
    tbody.innerHTML = '';
    transactions.slice(0, 10).forEach(t => {
        const row = document.createElement('tr');
        row.className = 'text-emerald-100/80';
        row.innerHTML = `
            <td class="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm">${formatDateBR(t.date)}</td>
            <td class="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm">${t.type}</td>
            <td class="px-3 sm:px-6 py-2 sm:py-4 text-right font-mono text-xs sm:text-sm text-emerald-400">+${formatCurrency(t.value)}</td>`;
        tbody.appendChild(row);
    });

    const monthlyData = {};
    transactions.forEach(t => {
        const month = getMonthKey(t.date);
        monthlyData[month] = (monthlyData[month] || 0) + t.value;
    });
    const lbs = Object.keys(monthlyData).sort();
    const vals = lbs.map(l => monthlyData[l]);
    const mn   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    const ctx = document.getElementById('userMonthlyChart')?.getContext('2d');
    if (ctx) {
        if (window.userChartInstance) window.userChartInstance.destroy();
        window.userChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: lbs.map(l => { const [y,m] = l.split('-'); return `${mn[parseInt(m)-1]}/${y}`; }),
                datasets: [{ label: 'Contribuição', data: vals, borderColor: colors.primary, backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: colors.primary }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: colors.grid }, ticks: { color: colors.slate, font: { size: 10 } } },
                    x: { grid: { display: false }, ticks: { color: colors.slate, font: { size: 10 } } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
}

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────────

function bindOptional(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
}

bindOptional('search-input', 'input',  () => applyFilters(false));
bindOptional('filter-type',  'change', () => applyFilters(false));
bindOptional('filter-month', 'change', () => applyFilters(false));
bindOptional('chart-period', 'change', renderCharts);

bindOptional('prev-page', 'click', () => {
    const months = getAvailableMonths(appState.filteredTransactions);
    if (appState.pagination.monthIndex < months.length - 1) { appState.pagination.monthIndex++; renderTable(); }
});

bindOptional('next-page', 'click', () => {
    if (appState.pagination.monthIndex > 0) { appState.pagination.monthIndex--; renderTable(); }
});

bindOptional('refresh-btn', 'click', () => loadFromConvex());

bindOptional('export-btn', 'click', () => {
    const viewMonth = getViewMonth();
    const toExport  = viewMonth
        ? appState.filteredTransactions.filter(t => getMonthKey(t.date) === viewMonth)
        : appState.filteredTransactions;
    const csv = "data:text/csv;charset=utf-8,"
        + "Data,Hora,Nome,Tipo,Detalhe,Valor\n"
        + toExport.map(t => `${t.date},${t.time},${maskName(t.name, null, t.value)},${t.type},${t.detail},${t.value}`).join("\n");
    const link = Object.assign(document.createElement("a"), { href: encodeURI(csv), download: "amrts_relatorio.csv" });
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// ── Importar CSV (botão mobile do menu hambúrguer → direto no input) ──
bindOptional('import-csv-btn-mob', 'click', () => {
    document.getElementById('mobile-menu')?.classList.add('hidden');
    document.getElementById('csv-file-input')?.click();
});

const csvInput = document.getElementById('csv-file-input');
if (csvInput) {
    csvInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const btn = document.getElementById('import-csv-btn');
        if (btn) btn.textContent = 'Importando...';

        let totalInserted = 0, totalSkipped = 0;

        for (const file of files) {
            const text = await file.text();
            try {
                const result = await importCSVToConvex(text);
                totalInserted += result.inserted;
                totalSkipped  += result.skipped;
            } catch (err) {
                console.error(`Erro ao importar ${file.name}:`, err);
                alert(`Erro ao importar ${file.name}: ${err.message}`);
            }
        }

        if (btn) btn.textContent = 'Importar CSV';
        alert(`✅ Importação concluída!\n\n${totalInserted} transações novas\n${totalSkipped} duplicatas ignoradas`);

        // Recarrega do Convex após importação
        await loadFromConvex();
        csvInput.value = '';
    });
}

// ── Layout e Tema ──
const body       = document.body;
const mainWrapper = document.querySelector('.max-w-\\[1440px\\]');

document.getElementById('layout-boxed')?.addEventListener('click', () => {
    mainWrapper.style.maxWidth = '1440px';
    document.getElementById('layout-boxed').className = 'px-3 py-1 text-xs rounded-md bg-emerald-600 text-white shadow-lg transition-all';
    document.getElementById('layout-wide').className  = 'px-3 py-1 text-xs rounded-md text-emerald-400 hover:text-emerald-200 transition-all';
});

document.getElementById('layout-wide')?.addEventListener('click', () => {
    mainWrapper.style.maxWidth = '100%';
    document.getElementById('layout-wide').className  = 'px-3 py-1 text-xs rounded-md bg-emerald-600 text-white shadow-lg transition-all';
    document.getElementById('layout-boxed').className = 'px-3 py-1 text-xs rounded-md text-emerald-400 hover:text-emerald-200 transition-all';
});

document.getElementById('theme-toggle')?.addEventListener('click', () => {
    body.classList.toggle('light');
    const isLight = body.classList.contains('light');
    document.getElementById('theme-toggle').innerHTML = isLight
        ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>`;

    if (window.monthlyChartInstance) {
        const color = isLight ? '#475569' : '#94a3b8';
        window.monthlyChartInstance.options.scales.y.ticks.color = color;
        window.monthlyChartInstance.options.scales.x.ticks.color = color;
        window.monthlyChartInstance.update();
    }
});

document.getElementById('print-btn')?.addEventListener('click', () => window.print());

// ── Portal do Associado ──
const contributorModal = document.getElementById('contributor-modal');

document.getElementById('contributor-portal-btn')?.addEventListener('click', () => {
    contributorModal?.classList.remove('hidden');
    document.getElementById('portal-search-step')?.classList.remove('hidden');
    document.getElementById('portal-results-step')?.classList.add('hidden');
    const input = document.getElementById('portal-search-input');
    if (input) input.value = '';
    document.getElementById('portal-error')?.classList.add('hidden');
});

document.getElementById('close-modal')?.addEventListener('click', () => {
    contributorModal?.classList.add('hidden');
});

document.getElementById('back-to-search')?.addEventListener('click', () => {
    document.getElementById('portal-search-step')?.classList.remove('hidden');
    document.getElementById('portal-results-step')?.classList.add('hidden');
});

document.getElementById('portal-search-input')?.addEventListener('input', (e) => {
    // Aceita só dígitos, máx 5
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5);
});

document.getElementById('portal-search-btn')?.addEventListener('click', async () => {
    const prefix = document.getElementById('portal-search-input')?.value.trim() || '';
    const portalError = document.getElementById('portal-error');

    if (prefix.length < 5) {
        if (portalError) portalError.textContent = 'Digite os 5 primeiros dígitos do CPF.';
        portalError?.classList.remove('hidden');
        return;
    }

    const btn = document.getElementById('portal-search-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Buscando…'; }

    try {
        // 1. Busca associado pelo prefix do CPF no Convex
        const matches = await convexQuery('associates:searchAssociate', { search: prefix });

        // Filtra apenas quem tem cpfPrefix começando com o input
        const associate = (matches || []).find(a => a.cpfPrefix && a.cpfPrefix.startsWith(prefix));

        if (!associate) {
            if (portalError) portalError.textContent = 'CPF não encontrado. Verifique os dígitos ou fale com a administração.';
            portalError?.classList.remove('hidden');
            return;
        }

        // 2. Filtra transações locais pelo nome do associado
        const name = associate.name;
        const userTxs = appState.rawTransactions.filter(
            t => t.value > 0 && t.name.toLowerCase() === name.toLowerCase()
        );

        if (!userTxs.length) {
            if (portalError) portalError.textContent = 'Nenhuma contribuição encontrada para este CPF.';
            portalError?.classList.remove('hidden');
            return;
        }

        portalError?.classList.add('hidden');
        document.getElementById('portal-search-step')?.classList.add('hidden');
        document.getElementById('portal-results-step')?.classList.remove('hidden');
        renderUserPortal(userTxs, name);

    } catch (err) {
        console.error('Erro no portal:', err);
        if (portalError) portalError.textContent = 'Erro ao consultar. Tente novamente.';
        portalError?.classList.remove('hidden');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Consultar'; }
    }
});

// ─── AUTENTICAÇÃO VIA CONVEX ──────────────────────────────────────────────────
// Usuários persistidos na tabela `users` do Convex com hash SHA-256.

/** Retorna o hash SHA-256 (hex) de uma string, usando Web Crypto API. */
async function hashPassword(password) {
    const enc  = new TextEncoder();
    const buf  = await crypto.subtle.digest('SHA-256', enc.encode(password));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Garante que o primeiro sysadmin existe no Convex (migração idempotente).
 * Chamado uma vez na inicialização — se já existe, retorna sem fazer nada.
 */
async function ensureSysAdmin() {
    try {
        const hash = await hashPassword('S3msenha');
        await convexMutation('users:seedSysAdmin', {
            name:         'Hans Rogério Zimmermann',
            email:        'zrhans@gmail.com',
            passwordHash: hash,
        });
    } catch (_) { /* ignora — já existe ou Convex offline */ }
}
ensureSysAdmin();

const adminModal       = document.getElementById('admin-modal');
const adminControls    = document.getElementById('admin-controls');
const adminLoginBtn    = document.getElementById('admin-login-btn');
const adminLogoutBtn   = document.getElementById('admin-logout-btn');
const adminModalClose  = document.getElementById('admin-modal-close');
const adminConfirmBtn  = document.getElementById('admin-login-confirm');
const adminEmailInput  = document.getElementById('admin-email');
const adminPassInput   = document.getElementById('admin-password');
const adminLoginError  = document.getElementById('admin-login-error');

/** Exibe mensagem de erro detalhada no modal de login. */
function showLoginError(msg = 'Credenciais inválidas.') {
    if (!adminLoginError) return;
    adminLoginError.textContent = msg;
    adminLoginError.classList.remove('hidden');
}

/** Toast simples: notificação flutuante no canto inferior. */
function showToast(msg, type = 'info', durationMs = 3000) {
    const colors = { success: 'bg-emerald-700', error: 'bg-red-700', info: 'bg-slate-700' };
    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-2xl text-sm text-white shadow-xl transition-all duration-300 opacity-0 ${colors[type] || colors.info}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, durationMs);
}

/**
 * Ativa/desativa modo admin.
 * @param {boolean} isAdmin
 * @param {{ name: string, email: string, role: string }|null} user  – dados do Convex
 */
function setAdminMode(isAdmin, user = null) {
    // Persistência de sessão
    if (isAdmin) {
        const stored = user || JSON.parse(sessionStorage.getItem('adminUser') || 'null');
        if (stored) sessionStorage.setItem('adminUser', JSON.stringify(stored));
        sessionStorage.setItem('adminSession', '1');

        // Atualiza info do usuário no drawer
        const nameEl = document.getElementById('drawer-user-name');
        const roleEl = document.getElementById('drawer-user-role');
        if (nameEl) nameEl.textContent = stored?.name  || 'Admin';
        if (roleEl) roleEl.textContent = stored?.role  || 'admin';
    } else {
        sessionStorage.removeItem('adminSession');
        sessionStorage.removeItem('adminUser');
    }

    // Drawer admin sections
    const drawerLoginWrap    = document.getElementById('drawer-admin-login-wrap');
    const drawerControlsWrap = document.getElementById('drawer-admin-controls-wrap');
    if (drawerLoginWrap)    drawerLoginWrap.classList.toggle('hidden', isAdmin);
    if (drawerControlsWrap) drawerControlsWrap.classList.toggle('hidden', !isAdmin);

    const adminControlsMob = document.getElementById('admin-controls-mob');
    const adminLoginBtnMob = document.getElementById('admin-login-btn-mob');
    if (isAdmin) {
        adminControls?.classList.remove('hidden');
        adminControls?.classList.add('flex');
        adminLoginBtn?.classList.add('hidden');
        adminControlsMob?.classList.remove('hidden');
        adminControlsMob?.classList.add('flex');
        adminLoginBtnMob?.classList.add('hidden');
    } else {
        adminControls?.classList.add('hidden');
        adminControls?.classList.remove('flex');
        adminLoginBtn?.classList.remove('hidden');
        adminControlsMob?.classList.add('hidden');
        adminControlsMob?.classList.remove('flex');
        adminLoginBtnMob?.classList.remove('hidden');
    }
    // Atualiza botões admin nos módulos da Fase 2
    if (typeof syncAdminButtons === 'function') syncAdminButtons(isAdmin);
    // Re-renderiza módulo atual se já carregado
    if (typeof currentModule !== 'undefined') {
        if (currentModule === 'comunicados' && typeof renderAnnouncements === 'function') renderAnnouncements();
        if (currentModule === 'documentos'  && typeof renderDocuments    === 'function') renderDocuments();
        if (currentModule === 'assembleias' && typeof renderAssemblies   === 'function') renderAssemblies();
    }
}

adminLoginBtn?.addEventListener('click', () => {
    adminModal?.classList.remove('hidden');
    adminLoginError?.classList.add('hidden');
    if (adminEmailInput) adminEmailInput.value = '';
    if (adminPassInput) adminPassInput.value = '';
    setTimeout(() => adminEmailInput?.focus(), 100);
});

adminModalClose?.addEventListener('click', () => {
    adminModal?.classList.add('hidden');
});

adminModal?.addEventListener('click', (e) => {
    if (e.target === adminModal) adminModal.classList.add('hidden');
});

adminConfirmBtn?.addEventListener('click', async () => {
    const email = adminEmailInput?.value.trim();
    const pass  = adminPassInput?.value;
    if (!email || !pass) return;

    // Feedback visual
    adminConfirmBtn.disabled = true;
    const origLabel = adminConfirmBtn.textContent;
    adminConfirmBtn.textContent = 'Verificando…';

    try {
        const hash = await hashPassword(pass);
        const user = await convexQuery('users:authenticate', { email, passwordHash: hash });
        if (user) {
            adminModal?.classList.add('hidden');
            setAdminMode(true, user);
            // Guia o usuário no mobile: notifica que o CSV fica no menu
            if (window.innerWidth < 768) showToast('Admin ativo — use o menu ≡ para Importar CSV', 'success', 4000);
        } else {
            showLoginError('E-mail ou senha incorretos.');
            if (adminPassInput) adminPassInput.value = '';
            adminPassInput?.focus();
        }
    } catch (err) {
        console.error('Erro no login:', err);
        // Mostra mensagem de erro legível (ex: timeout, função não encontrada)
        showLoginError(err.message || 'Erro ao conectar. Tente novamente.');
    } finally {
        adminConfirmBtn.disabled = false;
        adminConfirmBtn.textContent = origLabel;
    }
});

// Permitir Enter para confirmar login
adminEmailInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') adminPassInput?.focus();
});
adminPassInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') adminConfirmBtn?.click();
});

adminLogoutBtn?.addEventListener('click', () => setAdminMode(false));

// Restaurar sessão admin se já estava logado
if (sessionStorage.getItem('adminSession') === '1') {
    const storedUser = JSON.parse(sessionStorage.getItem('adminUser') || 'null');
    setAdminMode(true, storedUser);
}

// ─── MENU MOBILE ─────────────────────────────────────────────────────────────

(function initMobileMenu() {
    const menuBtn  = document.getElementById('mobile-menu-btn');
    const menu     = document.getElementById('mobile-menu');
    if (!menuBtn || !menu) return;

    // Abrir / fechar ao clicar no ☰
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
    });

    // Fechar ao clicar fora do menu
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== menuBtn) {
            menu.classList.add('hidden');
        }
    });

    // Delegação: botões mobile → botões desktop (mantém a lógica centralizada)
    const delegates = [
        ['contributor-portal-btn-mob', 'contributor-portal-btn'],
        ['theme-toggle-mob',           'theme-toggle'],
        ['layout-boxed-mob',           'layout-boxed'],
        ['layout-wide-mob',            'layout-wide'],
        ['print-btn-mob',              'print-btn'],
        ['refresh-btn-mob',            'refresh-btn'],
        ['admin-login-btn-mob',        'admin-login-btn'],
        ['admin-logout-btn-mob',       'admin-logout-btn'],
    ];

    delegates.forEach(([mobId, desktopId]) => {
        const mobEl     = document.getElementById(mobId);
        const desktopEl = document.getElementById(desktopId);
        if (!mobEl || !desktopEl) return;
        mobEl.addEventListener('click', () => {
            menu.classList.add('hidden'); // fecha o menu
            desktopEl.click();           // dispara a ação original
        });
    });
})();

// ─── NAVIGATION DRAWER ───────────────────────────────────────────────────────

const navDrawer    = document.getElementById('nav-drawer');
const navBackdrop  = document.getElementById('nav-backdrop');
const navDrawerBtn = document.getElementById('nav-drawer-btn');
const closeNavBtn  = document.getElementById('close-nav-drawer');

function openDrawer() {
    navDrawer?.classList.remove('-translate-x-full');
    navBackdrop?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}
function closeDrawer() {
    navDrawer?.classList.add('-translate-x-full');
    navBackdrop?.classList.add('hidden');
    document.body.style.overflow = '';
}

navDrawerBtn?.addEventListener('click', openDrawer);
closeNavBtn?.addEventListener('click', closeDrawer);
navBackdrop?.addEventListener('click', closeDrawer);

// Botões admin dentro do drawer — acionam diretamente sem delegação
document.getElementById('drawer-admin-login-btn')?.addEventListener('click', () => {
    closeDrawer();
    setTimeout(() => {
        const modal = document.getElementById('admin-modal');
        const err   = document.getElementById('admin-login-error');
        const email = document.getElementById('admin-email');
        const pass  = document.getElementById('admin-password');
        if (modal) modal.classList.remove('hidden');
        err?.classList.add('hidden');
        if (email) email.value = '';
        if (pass)  pass.value  = '';
        setTimeout(() => email?.focus(), 100);
    }, 50);
});
document.getElementById('drawer-admin-logout-btn')?.addEventListener('click', () => {
    closeDrawer();
    setAdminMode(false);
});
document.getElementById('drawer-import-csv-btn')?.addEventListener('click', () => {
    closeDrawer();
    document.getElementById('csv-file-input')?.click();
});

// ─── IMPORTAR CSV DE ASSOCIADOS ───────────────────────────────────────────────

document.getElementById('drawer-import-associates-btn')?.addEventListener('click', () => {
    closeDrawer();
    document.getElementById('associates-csv-input')?.click();
});

document.getElementById('associates-csv-input')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';   // permite reselecionar o mesmo arquivo

    showToast('Processando CSV de associados…', 'info', 3000);

    try {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) throw new Error('CSV vazio ou sem dados.');

        // Detecta separador (vírgula ou ponto-e-vírgula)
        const sep = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(sep).map(h => h.trim().toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')  // remove acentos
            .replace(/\s+/g, '_'));

        // Mapeamento flexível de colunas
        const col = (names) => names.map(n => headers.indexOf(n)).find(i => i >= 0) ?? -1;
        const iNome      = col(['nome', 'name']);
        const iCpf       = col(['cpf']);
        const iEmail     = col(['e-mail', 'email']);
        const iTel       = col(['telefone', 'tel', 'fone', 'celular']);
        const iAdesao    = col(['adesao', 'adesão', 'joined_at', 'data_adesao']);
        const iDeslig    = col(['desligamento', 'left_at', 'data_desligamento', 'saida', 'saída']);

        if (iNome < 0) throw new Error('Coluna "Nome" não encontrada no CSV.');

        // Formata data BR (dd/mm/yyyy) ou ISO para ISO (yyyy-mm-dd)
        function parseDate(str) {
            if (!str || !str.trim()) return undefined;
            const s = str.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;       // já é ISO
            const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
            return undefined;
        }

        const associates = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
            const name = cols[iNome]?.trim();
            if (!name) continue;

            const cpfRaw  = iCpf  >= 0 ? cols[iCpf]?.replace(/\D/g, '') : '';
            const leftAt  = iDeslig  >= 0 ? parseDate(cols[iDeslig])  : undefined;
            const joinedAt = iAdesao >= 0 ? parseDate(cols[iAdesao]) : undefined;

            associates.push({
                name,
                cpf:       cpfRaw || undefined,
                cpfPrefix: cpfRaw ? cpfRaw.substring(0, 5) : undefined,
                email:     iEmail >= 0 ? cols[iEmail]?.trim() || undefined : undefined,
                phone:     iTel   >= 0 ? cols[iTel]?.trim()   || undefined : undefined,
                joinedAt,
                leftAt,
                // Se tem data de desligamento → inativo; senão → ativo
                status:    leftAt ? 'inativo' : 'ativo',
            });
        }

        if (!associates.length) throw new Error('Nenhum associado válido encontrado.');

        // Envia em lotes de 50
        const CHUNK = 50;
        let inserted = 0, updated = 0;
        for (let i = 0; i < associates.length; i += CHUNK) {
            const chunk = associates.slice(i, i + CHUNK);
            const lote  = Math.floor(i / CHUNK) + 1;
            const total = Math.ceil(associates.length / CHUNK);
            showToast(`Importando associados ${lote}/${total}…`, 'info', 3500);
            const r = await convexMutationLong('associates:importAssociates', { associates: chunk });
            inserted += r.inserted || 0;
            updated  += r.updated  || 0;
        }
        showToast(
            `✓ ${inserted} inseridos, ${updated} atualizados (total: ${associates.length})`,
            'success', 5000
        );
    } catch (err) {
        console.error('Erro ao importar associados:', err);
        showToast('Erro: ' + err.message, 'error', 7000);
    }
});

document.getElementById('drawer-clear-transactions-btn')?.addEventListener('click', async () => {
    closeDrawer();
    const ok = confirm(
        '⚠️ Limpar TODO o histórico de transações?\n\n' +
        'Esta ação apaga todos os registros do Convex e não pode ser desfeita.\n' +
        'Use antes de reimportar o CSV com dados corrigidos.'
    );
    if (!ok) return;
    try {
        const result = await convexMutation('transactions:clearAllTransactions', {});
        showToast(`✓ ${result.deleted} transações removidas`, 'success', 4000);
        appState.rawTransactions = [];
        appState.filteredTransactions = [];
        appState.summary = { totalReceived:0, totalSent:0, netBalance:0, contributorsCount:0, receivedCount:0, sentCount:0 };
        renderTable();
        renderCharts();
    } catch (err) {
        console.error('Erro ao limpar histórico:', err);
        showToast('Erro: ' + err.message, 'error', 6000);
    }
});

// ─── NAVEGAÇÃO DE MÓDULOS ─────────────────────────────────────────────────────

let currentModule = 'financeiro';
const moduleLoaded = { financeiro: true, comunicados: false, documentos: false, assembleias: false, fornecedores: false, patrimonio: false, reservas: false, manutencao: false, visitantes: false };

function switchModule(name) {
    if (name === currentModule) { closeDrawer(); return; }
    // Oculta seção atual
    document.querySelector(`#module-${currentModule}`)?.classList.add('hidden');
    // Mostra nova seção
    document.querySelector(`#module-${name}`)?.classList.remove('hidden');
    // Atualiza itens do drawer
    document.querySelectorAll('.drawer-nav-item').forEach(btn => {
        const isActive = btn.dataset.module === name;
        btn.classList.toggle('active', isActive);
        btn.classList.toggle('bg-emerald-600/20', isActive);
        btn.classList.toggle('text-emerald-300', isActive);
        btn.classList.toggle('border', isActive);
        btn.classList.toggle('border-emerald-600/30', isActive);
        btn.classList.toggle('text-emerald-600', !isActive);
        btn.classList.toggle('hover:bg-emerald-900/30', !isActive);
        btn.classList.toggle('hover:text-emerald-300', !isActive);
    });
    currentModule = name;
    closeDrawer();
    // Carrega dados do módulo se ainda não carregou
    if (!moduleLoaded[name]) {
        moduleLoaded[name] = true;
        if (name === 'comunicados')  loadAnnouncements();
        if (name === 'documentos')   loadDocuments();
        if (name === 'assembleias')  loadAssemblies();
        if (name === 'fornecedores') loadSuppliers();
        if (name === 'patrimonio')   loadAssets();
        if (name === 'reservas')     loadReservations();
        if (name === 'manutencao')   loadMaintenances();
        if (name === 'visitantes')   loadVisitors();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('.drawer-nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchModule(btn.dataset.module));
});

// Mostra/oculta botões admin nos módulos
function syncAdminButtons(isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => {
        el.classList.toggle('hidden', !isAdmin);
        if (isAdmin) el.classList.remove('hidden');
    });
}

// ─── HELPERS MODAIS ───────────────────────────────────────────────────────────

function openModal(id) {
    document.getElementById(id)?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}
function closeModal(id) {
    document.getElementById(id)?.classList.add('hidden');
    document.body.style.overflow = '';
}

function fmtDateBR(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}
function fmtTs(ts) {
    const d = new Date(ts);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

// ─── MÓDULO: COMUNICADOS ─────────────────────────────────────────────────────

let allAnnouncements = [];
let annFilter = 'all';

async function loadAnnouncements() {
    const list = document.getElementById('announcements-list');
    if (list) list.innerHTML = '<p class="text-emerald-700 text-sm animate-pulse">Carregando...</p>';
    try {
        const isAdmin = !!sessionStorage.getItem('adminSession');
        const fn = isAdmin ? 'announcements:getAllAnnouncements' : 'announcements:getActiveAnnouncements';
        allAnnouncements = await convexQuery(fn) || [];
        renderAnnouncements();
    } catch(e) { console.error('Erro ao carregar comunicados:', e); }
}

function renderAnnouncements() {
    const list  = document.getElementById('announcements-list');
    const empty = document.getElementById('announcements-empty');
    if (!list) return;
    const filtered = annFilter === 'all' ? allAnnouncements : allAnnouncements.filter(a => a.type === annFilter);
    if (!filtered.length) { list.innerHTML=''; empty?.classList.remove('hidden'); return; }
    empty?.classList.add('hidden');
    const typeConfig = {
        urgente:    { emoji:'🔴', label:'Urgente',    border:'border-red-500/40',     bg:'bg-red-500/10',     badge:'bg-red-500/20 text-red-400' },
        info:       { emoji:'🔵', label:'Info',       border:'border-blue-500/40',    bg:'bg-blue-500/10',    badge:'bg-blue-500/20 text-blue-400' },
        manutencao: { emoji:'🟡', label:'Manutenção', border:'border-yellow-500/40',  bg:'bg-yellow-500/10',  badge:'bg-yellow-500/20 text-yellow-400' },
        evento:     { emoji:'🟢', label:'Evento',     border:'border-emerald-500/40', bg:'bg-emerald-500/10', badge:'bg-emerald-500/20 text-emerald-400' },
    };
    const isAdmin = !!sessionStorage.getItem('adminSession');
    list.innerHTML = filtered.map(a => {
        const cfg = typeConfig[a.type] || typeConfig.info;
        return `
        <div class="bg-emerald-900/20 border ${cfg.border} rounded-2xl p-4 md:p-5 transition-all hover:bg-emerald-900/30">
            <div class="flex items-start justify-between gap-3 mb-2">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${cfg.badge}">${cfg.emoji} ${cfg.label}</span>
                    ${!a.active ? '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-700/50 text-slate-400">Rascunho</span>' : ''}
                </div>
                ${isAdmin ? `<button onclick="editAnnouncement('${a._id}')" class="shrink-0 p-1.5 rounded-lg text-emerald-700 hover:text-emerald-400 hover:bg-emerald-900/50 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>` : ''}
            </div>
            <h4 class="font-semibold text-white text-base mb-1">${a.title}</h4>
            <p class="text-emerald-200/70 text-sm leading-relaxed whitespace-pre-line">${a.content}</p>
            <p class="text-emerald-700 text-xs mt-3">${fmtTs(a.createdAt)}</p>
        </div>`;
    }).join('');
}

// Filtros de comunicados
document.querySelectorAll('.ann-filter').forEach(btn => {
    btn.addEventListener('click', () => {
        annFilter = btn.dataset.afilter;
        document.querySelectorAll('.ann-filter').forEach(b => {
            b.classList.toggle('bg-emerald-600', b === btn);
            b.classList.toggle('text-white', b === btn);
            b.classList.toggle('bg-emerald-900/40', b !== btn);
            b.classList.toggle('text-emerald-400', b !== btn);
        });
        renderAnnouncements();
    });
});

// Modal comunicado
document.getElementById('new-announcement-btn')?.addEventListener('click', () => {
    document.getElementById('announcement-edit-id').value = '';
    document.getElementById('ann-title').value = '';
    document.getElementById('ann-content').value = '';
    document.getElementById('ann-type').value = 'info';
    document.getElementById('ann-active').checked = true;
    document.getElementById('ann-delete-btn')?.classList.add('hidden');
    document.getElementById('announcement-modal-title').textContent = 'Novo Comunicado';
    openModal('announcement-modal');
});
document.getElementById('announcement-modal-close')?.addEventListener('click', () => closeModal('announcement-modal'));
document.getElementById('announcement-modal-backdrop')?.addEventListener('click', () => closeModal('announcement-modal'));

function editAnnouncement(id) {
    const a = allAnnouncements.find(x => x._id === id);
    if (!a) return;
    document.getElementById('announcement-edit-id').value = id;
    document.getElementById('ann-title').value = a.title;
    document.getElementById('ann-content').value = a.content;
    document.getElementById('ann-type').value = a.type;
    document.getElementById('ann-active').checked = a.active;
    document.getElementById('ann-delete-btn')?.classList.remove('hidden');
    document.getElementById('announcement-modal-title').textContent = 'Editar Comunicado';
    openModal('announcement-modal');
}

document.getElementById('ann-save-btn')?.addEventListener('click', async () => {
    const id      = document.getElementById('announcement-edit-id').value;
    const title   = document.getElementById('ann-title').value.trim();
    const content = document.getElementById('ann-content').value.trim();
    const type    = document.getElementById('ann-type').value;
    const active  = document.getElementById('ann-active').checked;
    if (!title || !content) { alert('Preencha título e conteúdo.'); return; }
    try {
        if (id) {
            await convexMutation('announcements:updateAnnouncement', { id, title, content, type, active });
        } else {
            await convexMutation('announcements:createAnnouncement', { title, content, type, active });
        }
        closeModal('announcement-modal');
        await loadAnnouncements();
    } catch(e) { alert('Erro ao salvar: ' + e.message); }
});

document.getElementById('ann-delete-btn')?.addEventListener('click', async () => {
    const id = document.getElementById('announcement-edit-id').value;
    if (!id || !confirm('Excluir este comunicado?')) return;
    await convexMutation('announcements:deleteAnnouncement', { id });
    closeModal('announcement-modal');
    await loadAnnouncements();
});

// ─── MÓDULO: DOCUMENTOS ──────────────────────────────────────────────────────

let allDocuments = [];
let docFilter = 'all';

async function loadDocuments() {
    const list = document.getElementById('documents-list');
    if (list) list.innerHTML = '<p class="col-span-3 text-emerald-700 text-sm animate-pulse">Carregando...</p>';
    try {
        allDocuments = await convexQuery('documents:getAllDocuments') || [];
        renderDocuments();
    } catch(e) { console.error('Erro ao carregar documentos:', e); }
}

function renderDocuments() {
    const list  = document.getElementById('documents-list');
    const empty = document.getElementById('documents-empty');
    if (!list) return;
    const filtered = docFilter === 'all' ? allDocuments : allDocuments.filter(d => d.category === docFilter);
    if (!filtered.length) { list.innerHTML=''; empty?.classList.remove('hidden'); return; }
    empty?.classList.add('hidden');
    const catConfig = {
        ata:         { emoji:'📋', label:'Ata',          badge:'bg-blue-500/20 text-blue-400' },
        regulamento: { emoji:'📜', label:'Regulamento',  badge:'bg-purple-500/20 text-purple-400' },
        contrato:    { emoji:'🤝', label:'Contrato',     badge:'bg-yellow-500/20 text-yellow-400' },
        outro:       { emoji:'📁', label:'Outro',        badge:'bg-slate-500/20 text-slate-400' },
    };
    const isAdmin = !!sessionStorage.getItem('adminSession');
    list.innerHTML = filtered.map(d => {
        const cfg = catConfig[d.category] || catConfig.outro;
        return `
        <div class="bg-emerald-900/20 border border-emerald-800/50 rounded-2xl p-4 flex flex-col gap-3 hover:bg-emerald-900/30 transition-all">
            <div class="flex items-start justify-between gap-2">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${cfg.badge}">${cfg.emoji} ${cfg.label}</span>
                ${isAdmin ? `<button onclick="editDocument('${d._id}')" class="shrink-0 p-1 rounded-lg text-emerald-700 hover:text-emerald-400 hover:bg-emerald-900/50 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>` : ''}
            </div>
            <div class="flex-1">
                <h4 class="font-semibold text-white text-sm mb-1">${d.title}</h4>
                ${d.description ? `<p class="text-emerald-600 text-xs leading-relaxed line-clamp-2">${d.description}</p>` : ''}
            </div>
            <div class="flex items-center justify-between gap-2 mt-auto">
                <span class="text-emerald-700 text-xs">${fmtDateBR(d.date)}</span>
                <a href="${d.fileUrl}" target="_blank" rel="noopener" class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700/40 hover:bg-emerald-600/50 text-emerald-300 rounded-lg text-xs font-medium transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    Abrir
                </a>
            </div>
        </div>`;
    }).join('');
}

document.querySelectorAll('.doc-filter').forEach(btn => {
    btn.addEventListener('click', () => {
        docFilter = btn.dataset.dfilter;
        document.querySelectorAll('.doc-filter').forEach(b => {
            b.classList.toggle('bg-emerald-600', b === btn);
            b.classList.toggle('text-white', b === btn);
            b.classList.toggle('bg-emerald-900/40', b !== btn);
            b.classList.toggle('text-emerald-400', b !== btn);
        });
        renderDocuments();
    });
});

document.getElementById('new-document-btn')?.addEventListener('click', () => {
    document.getElementById('document-edit-id').value = '';
    document.getElementById('doc-title').value = '';
    document.getElementById('doc-description').value = '';
    document.getElementById('doc-category').value = 'ata';
    document.getElementById('doc-date').value = '';
    document.getElementById('doc-url').value = '';
    document.getElementById('doc-delete-btn')?.classList.add('hidden');
    document.getElementById('document-modal-title').textContent = 'Adicionar Documento';
    openModal('document-modal');
});
document.getElementById('document-modal-close')?.addEventListener('click', () => closeModal('document-modal'));
document.getElementById('document-modal-backdrop')?.addEventListener('click', () => closeModal('document-modal'));

function editDocument(id) {
    const d = allDocuments.find(x => x._id === id);
    if (!d) return;
    document.getElementById('document-edit-id').value = id;
    document.getElementById('doc-title').value = d.title;
    document.getElementById('doc-description').value = d.description || '';
    document.getElementById('doc-category').value = d.category;
    document.getElementById('doc-date').value = d.date;
    document.getElementById('doc-url').value = d.fileUrl;
    document.getElementById('doc-delete-btn')?.classList.remove('hidden');
    document.getElementById('document-modal-title').textContent = 'Editar Documento';
    openModal('document-modal');
}

document.getElementById('doc-save-btn')?.addEventListener('click', async () => {
    const id   = document.getElementById('document-edit-id').value;
    const data = {
        title:       document.getElementById('doc-title').value.trim(),
        description: document.getElementById('doc-description').value.trim() || undefined,
        category:    document.getElementById('doc-category').value,
        date:        document.getElementById('doc-date').value,
        fileUrl:     document.getElementById('doc-url').value.trim(),
    };
    if (!data.title || !data.date || !data.fileUrl) { alert('Preencha título, data e link.'); return; }
    try {
        if (id) await convexMutation('documents:updateDocument', { id, ...data });
        else    await convexMutation('documents:createDocument', data);
        closeModal('document-modal');
        await loadDocuments();
    } catch(e) { alert('Erro ao salvar: ' + e.message); }
});

document.getElementById('doc-delete-btn')?.addEventListener('click', async () => {
    const id = document.getElementById('document-edit-id').value;
    if (!id || !confirm('Excluir este documento?')) return;
    await convexMutation('documents:deleteDocument', { id });
    closeModal('document-modal');
    await loadDocuments();
});

// ─── MÓDULO: ASSEMBLEIAS ──────────────────────────────────────────────────────

let allAssemblies = [];
let asmFilter = 'all';

async function loadAssemblies() {
    const list = document.getElementById('assemblies-list');
    if (list) list.innerHTML = '<p class="text-emerald-700 text-sm animate-pulse">Carregando...</p>';
    try {
        allAssemblies = await convexQuery('assemblies:getAllAssemblies') || [];
        renderAssemblies();
    } catch(e) { console.error('Erro ao carregar assembleias:', e); }
}

function renderAssemblies() {
    const list  = document.getElementById('assemblies-list');
    const empty = document.getElementById('assemblies-empty');
    if (!list) return;
    const filtered = asmFilter === 'all' ? allAssemblies : allAssemblies.filter(a => a.status === asmFilter);
    if (!filtered.length) { list.innerHTML=''; empty?.classList.remove('hidden'); return; }
    empty?.classList.add('hidden');
    const statusCfg = {
        agendada:  { label:'Agendada',  cls:'bg-blue-500/20 text-blue-300' },
        realizada: { label:'Realizada', cls:'bg-emerald-500/20 text-emerald-300' },
        cancelada: { label:'Cancelada', cls:'bg-red-500/20 text-red-400' },
    };
    const typeCfg = { ordinaria:'Ordinária', extraordinaria:'Extraordinária' };
    const isAdmin = !!sessionStorage.getItem('adminSession');
    list.innerHTML = filtered.map(a => {
        const scfg = statusCfg[a.status] || statusCfg.agendada;
        const totalVotes = (a.votes||[]).reduce((sum, v) => sum + v.options.reduce((s, o) => s + o.count, 0), 0);
        const votesHtml = (a.votes||[]).map(v => {
            const total = v.options.reduce((s,o)=>s+o.count,0);
            const optHtml = v.options.map(o => {
                const pct = total ? Math.round(o.count/total*100) : 0;
                return `<div class="flex items-center gap-2 text-xs">
                    <span class="w-24 truncate text-emerald-300">${o.label}</span>
                    <div class="flex-1 bg-emerald-950/50 rounded-full h-1.5"><div class="bg-emerald-500 h-1.5 rounded-full" style="width:${pct}%"></div></div>
                    <span class="text-emerald-600 w-12 text-right">${o.count} (${pct}%)</span>
                </div>`;
            }).join('');
            return `<div class="mt-3 pt-3 border-t border-emerald-800/30">
                <div class="flex items-center justify-between mb-2">
                    <p class="text-xs font-semibold text-emerald-400">${v.title}</p>
                    ${isAdmin ? `<button onclick="editVote('${v._id}','${a._id}')" class="text-[10px] text-emerald-700 hover:text-emerald-400 transition-colors">editar</button>` : ''}
                </div>
                ${optHtml}
                ${v.result ? `<p class="text-xs text-emerald-400 mt-2 font-medium">→ ${v.result}</p>` : ''}
            </div>`;
        }).join('');
        return `
        <div class="bg-emerald-900/20 border border-emerald-800/50 rounded-2xl p-4 md:p-5">
            <div class="flex items-start justify-between gap-3 mb-3">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-900/50 text-emerald-500">${typeCfg[a.type]||a.type}</span>
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${scfg.cls}">${scfg.label}</span>
                </div>
                ${isAdmin ? `<button onclick="editAssembly('${a._id}')" class="shrink-0 p-1.5 rounded-lg text-emerald-700 hover:text-emerald-400 hover:bg-emerald-900/50 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>` : ''}
            </div>
            <div class="flex items-center gap-4 text-sm text-emerald-300 mb-3">
                <span class="flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>${fmtDateBR(a.date)}</span>
                ${a.location ? `<span class="flex items-center gap-1.5 text-emerald-500"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>${a.location}</span>` : ''}
                ${a.attendees ? `<span class="text-emerald-600 text-xs">${a.attendees} presentes</span>` : ''}
            </div>
            <div class="bg-emerald-950/30 rounded-xl p-3 mb-3">
                <p class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Pauta</p>
                <p class="text-emerald-200/80 text-sm whitespace-pre-line leading-relaxed">${a.agenda}</p>
            </div>
            ${a.minutes ? `<div class="bg-emerald-950/20 rounded-xl p-3 mb-3"><p class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Ata / Resumo</p><p class="text-emerald-300/70 text-sm whitespace-pre-line leading-relaxed">${a.minutes}</p></div>` : ''}
            ${votesHtml}
            ${isAdmin ? `<button onclick="openNewVote('${a._id}')" class="mt-3 w-full px-4 py-2 border border-dashed border-emerald-800/50 rounded-xl text-xs text-emerald-700 hover:border-emerald-600 hover:text-emerald-400 transition-colors">+ Adicionar votação</button>` : ''}
        </div>`;
    }).join('');
}

document.querySelectorAll('.asm-filter').forEach(btn => {
    btn.addEventListener('click', () => {
        asmFilter = btn.dataset.sfilter;
        document.querySelectorAll('.asm-filter').forEach(b => {
            b.classList.toggle('bg-emerald-600', b === btn);
            b.classList.toggle('text-white', b === btn);
            b.classList.toggle('bg-emerald-900/40', b !== btn);
            b.classList.toggle('text-emerald-400', b !== btn);
        });
        renderAssemblies();
    });
});

document.getElementById('new-assembly-btn')?.addEventListener('click', () => {
    document.getElementById('assembly-edit-id').value = '';
    document.getElementById('asm-date').value = '';
    document.getElementById('asm-type').value = 'ordinaria';
    document.getElementById('asm-status').value = 'agendada';
    document.getElementById('asm-location').value = '';
    document.getElementById('asm-agenda').value = '';
    document.getElementById('asm-minutes').value = '';
    document.getElementById('asm-attendees').value = '';
    document.getElementById('asm-delete-btn')?.classList.add('hidden');
    document.getElementById('assembly-modal-title').textContent = 'Nova Assembleia';
    openModal('assembly-modal');
});
document.getElementById('assembly-modal-close')?.addEventListener('click', () => closeModal('assembly-modal'));
document.getElementById('assembly-modal-backdrop')?.addEventListener('click', () => closeModal('assembly-modal'));

function editAssembly(id) {
    const a = allAssemblies.find(x => x._id === id);
    if (!a) return;
    document.getElementById('assembly-edit-id').value = id;
    document.getElementById('asm-date').value = a.date;
    document.getElementById('asm-type').value = a.type;
    document.getElementById('asm-status').value = a.status;
    document.getElementById('asm-location').value = a.location || '';
    document.getElementById('asm-agenda').value = a.agenda;
    document.getElementById('asm-minutes').value = a.minutes || '';
    document.getElementById('asm-attendees').value = a.attendees || '';
    document.getElementById('asm-delete-btn')?.classList.remove('hidden');
    document.getElementById('assembly-modal-title').textContent = 'Editar Assembleia';
    openModal('assembly-modal');
}

document.getElementById('asm-save-btn')?.addEventListener('click', async () => {
    const id   = document.getElementById('assembly-edit-id').value;
    const att  = document.getElementById('asm-attendees').value;
    const data = {
        date:      document.getElementById('asm-date').value,
        type:      document.getElementById('asm-type').value,
        status:    document.getElementById('asm-status').value,
        location:  document.getElementById('asm-location').value.trim() || undefined,
        agenda:    document.getElementById('asm-agenda').value.trim(),
        minutes:   document.getElementById('asm-minutes').value.trim() || undefined,
        attendees: att ? parseInt(att) : undefined,
    };
    if (!data.date || !data.agenda) { alert('Preencha data e pauta.'); return; }
    try {
        if (id) await convexMutation('assemblies:updateAssembly', { id, ...data });
        else    await convexMutation('assemblies:createAssembly', data);
        closeModal('assembly-modal');
        await loadAssemblies();
    } catch(e) { alert('Erro ao salvar: ' + e.message); }
});

document.getElementById('asm-delete-btn')?.addEventListener('click', async () => {
    const id = document.getElementById('assembly-edit-id').value;
    if (!id || !confirm('Excluir esta assembleia e todas as suas votações?')) return;
    await convexMutation('assemblies:deleteAssembly', { id });
    closeModal('assembly-modal');
    await loadAssemblies();
});

// ─── VOTAÇÕES ─────────────────────────────────────────────────────────────────

function buildVoteOptions(options = []) {
    const c = document.getElementById('vote-options-container');
    if (!c) return;
    const defaults = options.length ? options : [
        { label:'Aprovado', count: 0 },
        { label:'Rejeitado', count: 0 },
        { label:'Abstenção', count: 0 },
    ];
    c.innerHTML = defaults.map((o, i) => `
        <div class="flex gap-2 items-center">
            <input type="text" value="${o.label}" placeholder="Opção ${i+1}" class="flex-1 bg-emerald-950/60 border border-emerald-800/50 rounded-xl px-3 py-2 text-sm text-white placeholder-emerald-700 focus:outline-none focus:border-emerald-500 vote-option-label">
            <input type="number" value="${o.count}" min="0" class="w-20 bg-emerald-950/60 border border-emerald-800/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 vote-option-count">
            <button onclick="this.parentElement.remove()" class="p-2 text-red-400/50 hover:text-red-400 transition-colors">×</button>
        </div>`).join('');
}

document.getElementById('add-vote-option-btn')?.addEventListener('click', () => {
    const c = document.getElementById('vote-options-container');
    const idx = c.children.length;
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center';
    div.innerHTML = `<input type="text" placeholder="Opção ${idx+1}" class="flex-1 bg-emerald-950/60 border border-emerald-800/50 rounded-xl px-3 py-2 text-sm text-white placeholder-emerald-700 focus:outline-none focus:border-emerald-500 vote-option-label"><input type="number" value="0" min="0" class="w-20 bg-emerald-950/60 border border-emerald-800/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 vote-option-count"><button onclick="this.parentElement.remove()" class="p-2 text-red-400/50 hover:text-red-400 transition-colors">×</button>`;
    c.appendChild(div);
});

function openNewVote(assemblyId) {
    document.getElementById('vote-assembly-id').value = assemblyId;
    document.getElementById('vote-edit-id').value = '';
    document.getElementById('vote-title').value = '';
    document.getElementById('vote-result').value = '';
    document.getElementById('vote-delete-btn')?.classList.add('hidden');
    buildVoteOptions();
    openModal('vote-modal');
}

function editVote(voteId, assemblyId) {
    const a = allAssemblies.find(x => x._id === assemblyId);
    const v = a?.votes?.find(x => x._id === voteId);
    if (!v) return;
    document.getElementById('vote-assembly-id').value = assemblyId;
    document.getElementById('vote-edit-id').value = voteId;
    document.getElementById('vote-title').value = v.title;
    document.getElementById('vote-result').value = v.result || '';
    document.getElementById('vote-delete-btn')?.classList.remove('hidden');
    buildVoteOptions(v.options);
    openModal('vote-modal');
}

document.getElementById('vote-modal-close')?.addEventListener('click', () => closeModal('vote-modal'));
document.getElementById('vote-modal-backdrop')?.addEventListener('click', () => closeModal('vote-modal'));

document.getElementById('vote-save-btn')?.addEventListener('click', async () => {
    const id         = document.getElementById('vote-edit-id').value;
    const assemblyId = document.getElementById('vote-assembly-id').value;
    const title      = document.getElementById('vote-title').value.trim();
    const result     = document.getElementById('vote-result').value.trim() || undefined;
    const labels  = [...document.querySelectorAll('.vote-option-label')].map(i => i.value.trim());
    const counts  = [...document.querySelectorAll('.vote-option-count')].map(i => parseInt(i.value) || 0);
    const options = labels.map((label, i) => ({ label, count: counts[i] })).filter(o => o.label);
    if (!title || !options.length) { alert('Preencha o assunto e pelo menos uma opção.'); return; }
    try {
        if (id) await convexMutation('assemblies:updateVote', { id, title, options, result });
        else    await convexMutation('assemblies:createVote', { assemblyId, title, options, result });
        closeModal('vote-modal');
        await loadAssemblies();
    } catch(e) { alert('Erro ao salvar: ' + e.message); }
});

document.getElementById('vote-delete-btn')?.addEventListener('click', async () => {
    const id = document.getElementById('vote-edit-id').value;
    if (!id || !confirm('Excluir esta votação?')) return;
    await convexMutation('assemblies:deleteVote', { id });
    closeModal('vote-modal');
    await loadAssemblies();
});

// ─── MÓDULO: FORNECEDORES ────────────────────────────────────────────────────

let allSuppliers = [];
let supFilter = 'all';

const catLabelSup = { limpeza:'Limpeza', manutencao:'Manutenção', seguranca:'Segurança', jardinagem:'Jardinagem', outro:'Outro' };
const catEmojiSup = { limpeza:'🧹', manutencao:'🔧', seguranca:'🔒', jardinagem:'🌿', outro:'📦' };
const fmtBRL = (v) => v != null ? new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v) : '—';

async function loadSuppliers() {
    const list = document.getElementById('suppliers-list');
    if (list) list.innerHTML = '<p class="text-emerald-700 text-sm animate-pulse">Carregando...</p>';
    try {
        allSuppliers = await convexQuery('suppliers:getAllSuppliers') || [];
        renderSuppliers();
    } catch(e) { console.error('Erro ao carregar fornecedores:', e); }
}

function renderSuppliers() {
    const list  = document.getElementById('suppliers-list');
    const empty = document.getElementById('suppliers-empty');
    if (!list) return;
    const filtered = supFilter === 'all' ? allSuppliers : allSuppliers.filter(s => s.status === supFilter);
    if (!filtered.length) { list.innerHTML = ''; empty?.classList.remove('hidden'); return; }
    empty?.classList.add('hidden');
    const isAdmin = !!sessionStorage.getItem('adminSession');
    list.innerHTML = filtered.map(s => {
        const statusBadge = s.status === 'ativo'
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-slate-500/20 text-slate-400';
        return `
        <div class="bg-emerald-900/20 border border-emerald-800/30 rounded-2xl p-4 md:p-5 flex items-center justify-between gap-4">
            <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2 mb-1">
                    <span class="text-sm font-semibold text-white">${s.name}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusBadge}">${s.status === 'ativo' ? '✅ Ativo' : '⛔ Inativo'}</span>
                </div>
                <div class="flex flex-wrap gap-3 text-xs text-emerald-600">
                    <span>${catEmojiSup[s.category] || '📦'} ${catLabelSup[s.category] || s.category}</span>
                    ${s.contact ? `<span>👤 ${s.contact}</span>` : ''}
                    ${s.phone ? `<span>📞 ${s.phone}</span>` : ''}
                    ${s.monthlyValue != null ? `<span class="text-emerald-400 font-medium">💰 ${fmtBRL(s.monthlyValue)}/mês</span>` : ''}
                </div>
            </div>
            ${isAdmin ? `<button onclick="editSupplier('${s._id}')" class="shrink-0 p-1.5 rounded-lg text-emerald-700 hover:text-emerald-400 hover:bg-emerald-900/50 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>` : ''}
        </div>`;
    }).join('');
}

document.querySelectorAll('.sup-filter').forEach(btn => {
    btn.addEventListener('click', () => {
        supFilter = btn.dataset.spfilter;
        document.querySelectorAll('.sup-filter').forEach(b => {
            b.classList.toggle('bg-emerald-600', b === btn);
            b.classList.toggle('text-white', b === btn);
            b.classList.toggle('bg-emerald-900/40', b !== btn);
            b.classList.toggle('text-emerald-400', b !== btn);
        });
        renderSuppliers();
    });
});

document.getElementById('new-supplier-btn')?.addEventListener('click', () => {
    document.getElementById('supplier-edit-id').value = '';
    document.getElementById('sup-name').value = '';
    document.getElementById('sup-category').value = 'limpeza';
    document.getElementById('sup-status').value = 'ativo';
    document.getElementById('sup-cnpj').value = '';
    document.getElementById('sup-contact').value = '';
    document.getElementById('sup-phone').value = '';
    document.getElementById('sup-email').value = '';
    document.getElementById('sup-contract-start').value = '';
    document.getElementById('sup-contract-end').value = '';
    document.getElementById('sup-monthly-value').value = '';
    document.getElementById('sup-notes').value = '';
    document.getElementById('sup-delete-btn')?.classList.add('hidden');
    document.getElementById('supplier-modal-title').textContent = 'Novo Fornecedor';
    openModal('supplier-modal');
});
document.getElementById('supplier-modal-close')?.addEventListener('click', () => closeModal('supplier-modal'));
document.getElementById('supplier-modal-backdrop')?.addEventListener('click', () => closeModal('supplier-modal'));

function editSupplier(id) {
    const s = allSuppliers.find(x => x._id === id);
    if (!s) return;
    document.getElementById('supplier-edit-id').value = id;
    document.getElementById('sup-name').value = s.name;
    document.getElementById('sup-category').value = s.category;
    document.getElementById('sup-status').value = s.status;
    document.getElementById('sup-cnpj').value = s.cnpj || '';
    document.getElementById('sup-contact').value = s.contact || '';
    document.getElementById('sup-phone').value = s.phone || '';
    document.getElementById('sup-email').value = s.email || '';
    document.getElementById('sup-contract-start').value = s.contractStart || '';
    document.getElementById('sup-contract-end').value = s.contractEnd || '';
    document.getElementById('sup-monthly-value').value = s.monthlyValue != null ? s.monthlyValue : '';
    document.getElementById('sup-notes').value = s.notes || '';
    document.getElementById('sup-delete-btn')?.classList.remove('hidden');
    document.getElementById('supplier-modal-title').textContent = 'Editar Fornecedor';
    openModal('supplier-modal');
}

document.getElementById('sup-save-btn')?.addEventListener('click', async () => {
    const id  = document.getElementById('supplier-edit-id').value;
    const mv  = document.getElementById('sup-monthly-value').value;
    const data = {
        name:          document.getElementById('sup-name').value.trim(),
        category:      document.getElementById('sup-category').value,
        status:        document.getElementById('sup-status').value,
        cnpj:          document.getElementById('sup-cnpj').value.trim() || undefined,
        contact:       document.getElementById('sup-contact').value.trim() || undefined,
        phone:         document.getElementById('sup-phone').value.trim() || undefined,
        email:         document.getElementById('sup-email').value.trim() || undefined,
        contractStart: document.getElementById('sup-contract-start').value || undefined,
        contractEnd:   document.getElementById('sup-contract-end').value || undefined,
        monthlyValue:  mv ? parseFloat(mv) : undefined,
        notes:         document.getElementById('sup-notes').value.trim() || undefined,
    };
    if (!data.name) { alert('Preencha o nome do fornecedor.'); return; }
    try {
        if (id) await convexMutation('suppliers:updateSupplier', { id, ...data });
        else    await convexMutation('suppliers:createSupplier', data);
        closeModal('supplier-modal');
        showToast('Fornecedor salvo com sucesso', 'success');
        await loadSuppliers();
    } catch(e) { alert('Erro ao salvar: ' + e.message); }
});

document.getElementById('sup-delete-btn')?.addEventListener('click', async () => {
    const id = document.getElementById('supplier-edit-id').value;
    if (!id || !confirm('Excluir este fornecedor?')) return;
    await convexMutation('suppliers:deleteSupplier', { id });
    closeModal('supplier-modal');
    showToast('Fornecedor excluído', 'info');
    await loadSuppliers();
});

// ─── MÓDULO: PATRIMÔNIO ──────────────────────────────────────────────────────

let allAssets = [];
let astFilter = 'all';

const catLabelAst = { equipamento:'Equipamento', veiculo:'Veículo', mobiliario:'Mobiliário', eletronico:'Eletrônico', outro:'Outro' };
const catEmojiAst = { equipamento:'⚙️', veiculo:'🚗', mobiliario:'🪑', eletronico:'💻', outro:'📦' };

async function loadAssets() {
    const list = document.getElementById('assets-list');
    if (list) list.innerHTML = '<p class="col-span-3 text-emerald-700 text-sm animate-pulse">Carregando...</p>';
    try {
        allAssets = await convexQuery('assets:getAllAssets') || [];
        renderAssets();
    } catch(e) { console.error('Erro ao carregar patrimônio:', e); }
}

function renderAssets() {
    const list  = document.getElementById('assets-list');
    const empty = document.getElementById('assets-empty');
    if (!list) return;
    const filtered = astFilter === 'all' ? allAssets : allAssets.filter(a => a.status === astFilter);
    if (!filtered.length) { list.innerHTML = ''; empty?.classList.remove('hidden'); return; }
    empty?.classList.add('hidden');
    const isAdmin = !!sessionStorage.getItem('adminSession');
    const statusBadgeCfg = {
        ativo:       'bg-emerald-500/20 text-emerald-400',
        manutencao:  'bg-yellow-500/20 text-yellow-400',
        inativo:     'bg-slate-500/20 text-slate-400',
    };
    const statusLabelCfg = { ativo:'✅ Ativo', manutencao:'🔧 Manutenção', inativo:'⛔ Inativo' };
    list.innerHTML = filtered.map(a => {
        const badge = statusBadgeCfg[a.status] || statusBadgeCfg.inativo;
        return `
        <div class="bg-emerald-900/20 border border-emerald-800/30 rounded-2xl p-4 md:p-5 flex flex-col gap-2">
            <div class="flex items-start justify-between gap-2">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${badge}">${statusLabelCfg[a.status] || a.status}</span>
                ${isAdmin ? `<button onclick="editAsset('${a._id}')" class="shrink-0 p-1 rounded-lg text-emerald-700 hover:text-emerald-400 hover:bg-emerald-900/50 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>` : ''}
            </div>
            <h4 class="font-semibold text-white text-sm">${a.name}</h4>
            <div class="flex flex-wrap gap-2 text-xs text-emerald-600">
                <span>${catEmojiAst[a.category] || '📦'} ${catLabelAst[a.category] || a.category}</span>
                ${a.location ? `<span>📍 ${a.location}</span>` : ''}
                ${a.acquisitionValue != null ? `<span class="text-emerald-500">${fmtBRL(a.acquisitionValue)}</span>` : ''}
            </div>
            ${a.description ? `<p class="text-emerald-700 text-xs line-clamp-2">${a.description}</p>` : ''}
        </div>`;
    }).join('');
}

document.querySelectorAll('.ast-filter').forEach(btn => {
    btn.addEventListener('click', () => {
        astFilter = btn.dataset.atfilter;
        document.querySelectorAll('.ast-filter').forEach(b => {
            b.classList.toggle('bg-emerald-600', b === btn);
            b.classList.toggle('text-white', b === btn);
            b.classList.toggle('bg-emerald-900/40', b !== btn);
            b.classList.toggle('text-emerald-400', b !== btn);
        });
        renderAssets();
    });
});

document.getElementById('new-asset-btn')?.addEventListener('click', () => {
    document.getElementById('asset-edit-id').value = '';
    document.getElementById('ast-name').value = '';
    document.getElementById('ast-category').value = 'equipamento';
    document.getElementById('ast-status').value = 'ativo';
    document.getElementById('ast-description').value = '';
    document.getElementById('ast-acquisition-date').value = '';
    document.getElementById('ast-acquisition-value').value = '';
    document.getElementById('ast-location').value = '';
    document.getElementById('ast-notes').value = '';
    document.getElementById('ast-delete-btn')?.classList.add('hidden');
    document.getElementById('asset-modal-title').textContent = 'Novo Bem';
    openModal('asset-modal');
});
document.getElementById('asset-modal-close')?.addEventListener('click', () => closeModal('asset-modal'));
document.getElementById('asset-modal-backdrop')?.addEventListener('click', () => closeModal('asset-modal'));

function editAsset(id) {
    const a = allAssets.find(x => x._id === id);
    if (!a) return;
    document.getElementById('asset-edit-id').value = id;
    document.getElementById('ast-name').value = a.name;
    document.getElementById('ast-category').value = a.category;
    document.getElementById('ast-status').value = a.status;
    document.getElementById('ast-description').value = a.description || '';
    document.getElementById('ast-acquisition-date').value = a.acquisitionDate || '';
    document.getElementById('ast-acquisition-value').value = a.acquisitionValue != null ? a.acquisitionValue : '';
    document.getElementById('ast-location').value = a.location || '';
    document.getElementById('ast-notes').value = a.notes || '';
    document.getElementById('ast-delete-btn')?.classList.remove('hidden');
    document.getElementById('asset-modal-title').textContent = 'Editar Bem';
    openModal('asset-modal');
}

document.getElementById('ast-save-btn')?.addEventListener('click', async () => {
    const id  = document.getElementById('asset-edit-id').value;
    const av  = document.getElementById('ast-acquisition-value').value;
    const data = {
        name:             document.getElementById('ast-name').value.trim(),
        category:         document.getElementById('ast-category').value,
        status:           document.getElementById('ast-status').value,
        description:      document.getElementById('ast-description').value.trim() || undefined,
        acquisitionDate:  document.getElementById('ast-acquisition-date').value || undefined,
        acquisitionValue: av ? parseFloat(av) : undefined,
        location:         document.getElementById('ast-location').value.trim() || undefined,
        notes:            document.getElementById('ast-notes').value.trim() || undefined,
    };
    if (!data.name) { alert('Preencha o nome do bem.'); return; }
    try {
        if (id) await convexMutation('assets:updateAsset', { id, ...data });
        else    await convexMutation('assets:createAsset', data);
        closeModal('asset-modal');
        showToast('Bem salvo com sucesso', 'success');
        await loadAssets();
    } catch(e) { alert('Erro ao salvar: ' + e.message); }
});

document.getElementById('ast-delete-btn')?.addEventListener('click', async () => {
    const id = document.getElementById('asset-edit-id').value;
    if (!id || !confirm('Excluir este bem?')) return;
    await convexMutation('assets:deleteAsset', { id });
    closeModal('asset-modal');
    showToast('Bem excluído', 'info');
    await loadAssets();
});

// ─── MÓDULO: RESERVAS ────────────────────────────────────────────────────────

let allReservations = [];
let rsvFilter = 'all';

const areaLabelRsv = { salao:'Salão de Festas', piscina:'Piscina', churrasqueira:'Churrasqueira', quadra:'Quadra', outro:'Outro' };
const areaEmojiRsv = { salao:'🎉', piscina:'🏊', churrasqueira:'🔥', quadra:'🏀', outro:'📍' };

async function loadReservations() {
    const list = document.getElementById('reservations-list');
    if (list) list.innerHTML = '<p class="text-emerald-700 text-sm animate-pulse">Carregando...</p>';
    try {
        allReservations = await convexQuery('reservations:getAllReservations') || [];
        renderReservations();
    } catch(e) { console.error('Erro ao carregar reservas:', e); }
}

function renderReservations() {
    const list  = document.getElementById('reservations-list');
    const empty = document.getElementById('reservations-empty');
    if (!list) return;
    const filtered = rsvFilter === 'all' ? allReservations : allReservations.filter(r => r.status === rsvFilter);
    if (!filtered.length) { list.innerHTML = ''; empty?.classList.remove('hidden'); return; }
    empty?.classList.add('hidden');
    const isAdmin = !!sessionStorage.getItem('adminSession');
    const statusCfgRsv = {
        pendente:   { cls:'bg-yellow-500/20 text-yellow-400', label:'⏳ Pendente' },
        confirmada: { cls:'bg-emerald-500/20 text-emerald-400', label:'✅ Confirmada' },
        cancelada:  { cls:'bg-red-500/20 text-red-400', label:'❌ Cancelada' },
    };
    list.innerHTML = filtered.map(r => {
        const scfg = statusCfgRsv[r.status] || statusCfgRsv.pendente;
        return `
        <div class="bg-emerald-900/20 border border-emerald-800/30 rounded-2xl p-4 md:p-5">
            <div class="flex items-start justify-between gap-3 mb-2">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-semibold text-white">${areaEmojiRsv[r.area] || '📍'} ${areaLabelRsv[r.area] || r.area}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${scfg.cls}">${scfg.label}</span>
                </div>
                ${isAdmin ? `<button onclick="editReservation('${r._id}')" class="shrink-0 p-1.5 rounded-lg text-emerald-700 hover:text-emerald-400 hover:bg-emerald-900/50 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>` : ''}
            </div>
            <div class="flex flex-wrap gap-3 text-xs text-emerald-600">
                <span>📅 ${fmtDateBR(r.date)}</span>
                <span>🕐 ${r.startTime} – ${r.endTime}</span>
                <span>🏠 Unid. ${r.unit}</span>
                <span>👤 ${r.residentName}</span>
            </div>
            ${r.notes ? `<p class="text-emerald-700 text-xs mt-2">${r.notes}</p>` : ''}
        </div>`;
    }).join('');
}

document.querySelectorAll('.rsv-filter').forEach(btn => {
    btn.addEventListener('click', () => {
        rsvFilter = btn.dataset.rvfilter;
        document.querySelectorAll('.rsv-filter').forEach(b => {
            b.classList.toggle('bg-emerald-600', b === btn);
            b.classList.toggle('text-white', b === btn);
            b.classList.toggle('bg-emerald-900/40', b !== btn);
            b.classList.toggle('text-emerald-400', b !== btn);
        });
        renderReservations();
    });
});

document.getElementById('new-reservation-btn')?.addEventListener('click', () => {
    document.getElementById('reservation-edit-id').value = '';
    document.getElementById('rsv-area').value = 'salao';
    document.getElementById('rsv-status').value = 'pendente';
    document.getElementById('rsv-unit').value = '';
    document.getElementById('rsv-resident').value = '';
    document.getElementById('rsv-date').value = '';
    document.getElementById('rsv-start-time').value = '';
    document.getElementById('rsv-end-time').value = '';
    document.getElementById('rsv-notes').value = '';
    document.getElementById('rsv-delete-btn')?.classList.add('hidden');
    document.getElementById('reservation-modal-title').textContent = 'Nova Reserva';
    openModal('reservation-modal');
});
document.getElementById('reservation-modal-close')?.addEventListener('click', () => closeModal('reservation-modal'));
document.getElementById('reservation-modal-backdrop')?.addEventListener('click', () => closeModal('reservation-modal'));

function editReservation(id) {
    const r = allReservations.find(x => x._id === id);
    if (!r) return;
    document.getElementById('reservation-edit-id').value = id;
    document.getElementById('rsv-area').value = r.area;
    document.getElementById('rsv-status').value = r.status;
    document.getElementById('rsv-unit').value = r.unit;
    document.getElementById('rsv-resident').value = r.residentName;
    document.getElementById('rsv-date').value = r.date;
    document.getElementById('rsv-start-time').value = r.startTime;
    document.getElementById('rsv-end-time').value = r.endTime;
    document.getElementById('rsv-notes').value = r.notes || '';
    document.getElementById('rsv-delete-btn')?.classList.remove('hidden');
    document.getElementById('reservation-modal-title').textContent = 'Editar Reserva';
    openModal('reservation-modal');
}

document.getElementById('rsv-save-btn')?.addEventListener('click', async () => {
    const id = document.getElementById('reservation-edit-id').value;
    const data = {
        area:         document.getElementById('rsv-area').value,
        status:       document.getElementById('rsv-status').value,
        unit:         document.getElementById('rsv-unit').value.trim(),
        residentName: document.getElementById('rsv-resident').value.trim(),
        date:         document.getElementById('rsv-date').value,
        startTime:    document.getElementById('rsv-start-time').value,
        endTime:      document.getElementById('rsv-end-time').value,
        notes:        document.getElementById('rsv-notes').value.trim() || undefined,
    };
    if (!data.unit || !data.residentName || !data.date || !data.startTime || !data.endTime) {
        alert('Preencha unidade, morador, data e horários.'); return;
    }
    try {
        if (id) await convexMutation('reservations:updateReservation', { id, ...data });
        else    await convexMutation('reservations:createReservation', data);
        closeModal('reservation-modal');
        showToast('Reserva salva com sucesso', 'success');
        await loadReservations();
    } catch(e) { alert('Erro ao salvar: ' + e.message); }
});

document.getElementById('rsv-delete-btn')?.addEventListener('click', async () => {
    const id = document.getElementById('reservation-edit-id').value;
    if (!id || !confirm('Excluir esta reserva?')) return;
    await convexMutation('reservations:deleteReservation', { id });
    closeModal('reservation-modal');
    showToast('Reserva excluída', 'info');
    await loadReservations();
});

// ─── MÓDULO: MANUTENÇÃO ──────────────────────────────────────────────────────

let allMaintenances = [];
let mntFilter = 'all';

async function loadMaintenances() {
    const list = document.getElementById('maintenances-list');
    if (list) list.innerHTML = '<p class="text-emerald-700 text-sm animate-pulse">Carregando...</p>';
    try {
        allMaintenances = await convexQuery('maintenances:getAllMaintenances') || [];
        renderMaintenances();
    } catch(e) { console.error('Erro ao carregar manutenções:', e); }
}

function renderMaintenances() {
    const list  = document.getElementById('maintenances-list');
    const empty = document.getElementById('maintenances-empty');
    if (!list) return;
    const filtered = mntFilter === 'all' ? allMaintenances : allMaintenances.filter(m => m.status === mntFilter);
    if (!filtered.length) { list.innerHTML = ''; empty?.classList.remove('hidden'); return; }
    empty?.classList.add('hidden');
    const isAdmin = !!sessionStorage.getItem('adminSession');
    const priorityCfg = {
        baixa:   { cls:'bg-slate-500/20 text-slate-400',   label:'🔵 Baixa' },
        media:   { cls:'bg-yellow-500/20 text-yellow-400', label:'🟡 Média' },
        alta:    { cls:'bg-orange-500/20 text-orange-400', label:'🟠 Alta' },
        urgente: { cls:'bg-red-500/20 text-red-400',       label:'🔴 Urgente' },
    };
    const statusCfgMnt = {
        aberto:       { cls:'bg-blue-500/20 text-blue-400',    label:'🔓 Aberto' },
        em_andamento: { cls:'bg-yellow-500/20 text-yellow-400',label:'⚙️ Em Andamento' },
        concluido:    { cls:'bg-emerald-500/20 text-emerald-400',label:'✅ Concluído' },
        cancelado:    { cls:'bg-red-500/20 text-red-400',      label:'❌ Cancelado' },
    };
    list.innerHTML = filtered.map(m => {
        const pcfg = priorityCfg[m.priority] || priorityCfg.media;
        const scfg = statusCfgMnt[m.status] || statusCfgMnt.aberto;
        return `
        <div class="bg-emerald-900/20 border border-emerald-800/30 rounded-2xl p-4 md:p-5">
            <div class="flex items-start justify-between gap-3 mb-2">
                <div class="flex flex-wrap gap-2">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${pcfg.cls}">${pcfg.label}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${scfg.cls}">${scfg.label}</span>
                </div>
                ${isAdmin ? `<button onclick="editMaintenance('${m._id}')" class="shrink-0 p-1.5 rounded-lg text-emerald-700 hover:text-emerald-400 hover:bg-emerald-900/50 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>` : ''}
            </div>
            <h4 class="font-semibold text-white text-sm mb-1">${m.title}</h4>
            <div class="flex flex-wrap gap-3 text-xs text-emerald-600">
                ${m.area ? `<span>📍 ${m.area}</span>` : ''}
                ${m.scheduledDate ? `<span>📅 ${fmtDateBR(m.scheduledDate)}</span>` : ''}
                ${m.cost != null ? `<span class="text-emerald-500">💰 ${fmtBRL(m.cost)}</span>` : ''}
            </div>
            ${m.description ? `<p class="text-emerald-700 text-xs mt-2 line-clamp-2">${m.description}</p>` : ''}
        </div>`;
    }).join('');
}

document.querySelectorAll('.mnt-filter').forEach(btn => {
    btn.addEventListener('click', () => {
        mntFilter = btn.dataset.mtfilter;
        document.querySelectorAll('.mnt-filter').forEach(b => {
            b.classList.toggle('bg-emerald-600', b === btn);
            b.classList.toggle('text-white', b === btn);
            b.classList.toggle('bg-emerald-900/40', b !== btn);
            b.classList.toggle('text-emerald-400', b !== btn);
        });
        renderMaintenances();
    });
});

document.getElementById('new-maintenance-btn')?.addEventListener('click', () => {
    document.getElementById('maintenance-edit-id').value = '';
    document.getElementById('mnt-title').value = '';
    document.getElementById('mnt-priority').value = 'media';
    document.getElementById('mnt-status').value = 'aberto';
    document.getElementById('mnt-area').value = '';
    document.getElementById('mnt-description').value = '';
    document.getElementById('mnt-scheduled-date').value = '';
    document.getElementById('mnt-cost').value = '';
    document.getElementById('mnt-notes').value = '';
    document.getElementById('mnt-delete-btn')?.classList.add('hidden');
    document.getElementById('maintenance-modal-title').textContent = 'Novo Chamado';
    openModal('maintenance-modal');
});
document.getElementById('maintenance-modal-close')?.addEventListener('click', () => closeModal('maintenance-modal'));
document.getElementById('maintenance-modal-backdrop')?.addEventListener('click', () => closeModal('maintenance-modal'));

function editMaintenance(id) {
    const m = allMaintenances.find(x => x._id === id);
    if (!m) return;
    document.getElementById('maintenance-edit-id').value = id;
    document.getElementById('mnt-title').value = m.title;
    document.getElementById('mnt-priority').value = m.priority;
    document.getElementById('mnt-status').value = m.status;
    document.getElementById('mnt-area').value = m.area || '';
    document.getElementById('mnt-description').value = m.description || '';
    document.getElementById('mnt-scheduled-date').value = m.scheduledDate || '';
    document.getElementById('mnt-cost').value = m.cost != null ? m.cost : '';
    document.getElementById('mnt-notes').value = m.notes || '';
    document.getElementById('mnt-delete-btn')?.classList.remove('hidden');
    document.getElementById('maintenance-modal-title').textContent = 'Editar Chamado';
    openModal('maintenance-modal');
}

document.getElementById('mnt-save-btn')?.addEventListener('click', async () => {
    const id  = document.getElementById('maintenance-edit-id').value;
    const cv  = document.getElementById('mnt-cost').value;
    const data = {
        title:         document.getElementById('mnt-title').value.trim(),
        priority:      document.getElementById('mnt-priority').value,
        status:        document.getElementById('mnt-status').value,
        area:          document.getElementById('mnt-area').value.trim() || undefined,
        description:   document.getElementById('mnt-description').value.trim() || undefined,
        scheduledDate: document.getElementById('mnt-scheduled-date').value || undefined,
        cost:          cv ? parseFloat(cv) : undefined,
        notes:         document.getElementById('mnt-notes').value.trim() || undefined,
    };
    if (!data.title) { alert('Preencha o título do chamado.'); return; }
    try {
        if (id) await convexMutation('maintenances:updateMaintenance', { id, ...data });
        else    await convexMutation('maintenances:createMaintenance', data);
        closeModal('maintenance-modal');
        showToast('Chamado salvo com sucesso', 'success');
        await loadMaintenances();
    } catch(e) { alert('Erro ao salvar: ' + e.message); }
});

document.getElementById('mnt-delete-btn')?.addEventListener('click', async () => {
    const id = document.getElementById('maintenance-edit-id').value;
    if (!id || !confirm('Excluir este chamado?')) return;
    await convexMutation('maintenances:deleteMaintenance', { id });
    closeModal('maintenance-modal');
    showToast('Chamado excluído', 'info');
    await loadMaintenances();
});

// ─── MÓDULO: VISITANTES ──────────────────────────────────────────────────────

let allVisitors = [];
let visFilter = 'all';

async function loadVisitors() {
    const list = document.getElementById('visitors-list');
    if (list) list.innerHTML = '<p class="text-emerald-700 text-sm animate-pulse">Carregando...</p>';
    try {
        allVisitors = await convexQuery('visitors:getAllVisitors') || [];
        renderVisitors();
    } catch(e) { console.error('Erro ao carregar visitantes:', e); }
}

function renderVisitors() {
    const list  = document.getElementById('visitors-list');
    const empty = document.getElementById('visitors-empty');
    if (!list) return;
    const filtered = visFilter === 'all' ? allVisitors : allVisitors.filter(v => v.status === visFilter);
    if (!filtered.length) { list.innerHTML = ''; empty?.classList.remove('hidden'); return; }
    empty?.classList.add('hidden');
    const isAdmin = !!sessionStorage.getItem('adminSession');
    list.innerHTML = filtered.map(v => {
        const statusBadge = v.status === 'presente'
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-slate-500/20 text-slate-400';
        const statusLabel = v.status === 'presente' ? '🟢 Presente' : '⚫ Saiu';
        return `
        <div class="bg-emerald-900/20 border border-emerald-800/30 rounded-2xl p-4 md:p-5">
            <div class="flex items-start justify-between gap-3 mb-2">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-semibold text-white">${v.name}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusBadge}">${statusLabel}</span>
                </div>
                <div class="flex gap-1 shrink-0">
                    ${isAdmin && v.status === 'presente' ? `<button onclick="registerVisitorExit('${v._id}')" class="px-2 py-1 text-[10px] font-bold bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg transition-colors">Registrar Saída</button>` : ''}
                    ${isAdmin ? `<button onclick="editVisitor('${v._id}')" class="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-400 hover:bg-emerald-900/50 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>` : ''}
                </div>
            </div>
            <div class="flex flex-wrap gap-3 text-xs text-emerald-600">
                <span>🏠 Unid. ${v.unit}</span>
                ${v.residentName ? `<span>👤 ${v.residentName}</span>` : ''}
                <span>📅 ${fmtDateBR(v.date)}</span>
                <span>🕐 Entrada: ${v.entryTime}</span>
                ${v.exitTime ? `<span>🕑 Saída: ${v.exitTime}</span>` : ''}
                ${v.vehicle ? `<span>🚗 ${v.vehicle}</span>` : ''}
            </div>
            ${v.purpose ? `<p class="text-emerald-700 text-xs mt-1">Motivo: ${v.purpose}</p>` : ''}
        </div>`;
    }).join('');
}

document.querySelectorAll('.vis-filter').forEach(btn => {
    btn.addEventListener('click', () => {
        visFilter = btn.dataset.vsfilter;
        document.querySelectorAll('.vis-filter').forEach(b => {
            b.classList.toggle('bg-emerald-600', b === btn);
            b.classList.toggle('text-white', b === btn);
            b.classList.toggle('bg-emerald-900/40', b !== btn);
            b.classList.toggle('text-emerald-400', b !== btn);
        });
        renderVisitors();
    });
});

function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function nowHHMM() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

document.getElementById('new-visitor-btn')?.addEventListener('click', () => {
    document.getElementById('visitor-edit-id').value = '';
    document.getElementById('vis-name').value = '';
    document.getElementById('vis-document').value = '';
    document.getElementById('vis-unit').value = '';
    document.getElementById('vis-resident').value = '';
    document.getElementById('vis-date').value = todayISO();
    document.getElementById('vis-entry-time').value = nowHHMM();
    document.getElementById('vis-exit-time').value = '';
    document.getElementById('vis-status').value = 'presente';
    document.getElementById('vis-purpose').value = '';
    document.getElementById('vis-vehicle').value = '';
    document.getElementById('vis-delete-btn')?.classList.add('hidden');
    document.getElementById('visitor-modal-title').textContent = 'Registrar Visitante';
    openModal('visitor-modal');
});
document.getElementById('visitor-modal-close')?.addEventListener('click', () => closeModal('visitor-modal'));
document.getElementById('visitor-modal-backdrop')?.addEventListener('click', () => closeModal('visitor-modal'));

function editVisitor(id) {
    const v = allVisitors.find(x => x._id === id);
    if (!v) return;
    document.getElementById('visitor-edit-id').value = id;
    document.getElementById('vis-name').value = v.name;
    document.getElementById('vis-document').value = v.document || '';
    document.getElementById('vis-unit').value = v.unit;
    document.getElementById('vis-resident').value = v.residentName || '';
    document.getElementById('vis-date').value = v.date;
    document.getElementById('vis-entry-time').value = v.entryTime;
    document.getElementById('vis-exit-time').value = v.exitTime || '';
    document.getElementById('vis-status').value = v.status;
    document.getElementById('vis-purpose').value = v.purpose || '';
    document.getElementById('vis-vehicle').value = v.vehicle || '';
    document.getElementById('vis-delete-btn')?.classList.remove('hidden');
    document.getElementById('visitor-modal-title').textContent = 'Editar Visitante';
    openModal('visitor-modal');
}

async function registerVisitorExit(id) {
    const exitTime = nowHHMM();
    try {
        await convexMutation('visitors:updateVisitor', { id, exitTime, status: 'saiu' });
        showToast('Saída registrada', 'success');
        await loadVisitors();
    } catch(e) { alert('Erro ao registrar saída: ' + e.message); }
}

document.getElementById('vis-save-btn')?.addEventListener('click', async () => {
    const id = document.getElementById('visitor-edit-id').value;
    const data = {
        name:        document.getElementById('vis-name').value.trim(),
        document:    document.getElementById('vis-document').value.trim() || undefined,
        unit:        document.getElementById('vis-unit').value.trim(),
        residentName:document.getElementById('vis-resident').value.trim() || undefined,
        date:        document.getElementById('vis-date').value,
        entryTime:   document.getElementById('vis-entry-time').value,
        exitTime:    document.getElementById('vis-exit-time').value || undefined,
        status:      document.getElementById('vis-status').value,
        purpose:     document.getElementById('vis-purpose').value.trim() || undefined,
        vehicle:     document.getElementById('vis-vehicle').value.trim() || undefined,
    };
    if (!data.name || !data.unit || !data.date || !data.entryTime) {
        alert('Preencha nome, unidade, data e hora de entrada.'); return;
    }
    try {
        if (id) await convexMutation('visitors:updateVisitor', { id, ...data });
        else    await convexMutation('visitors:createVisitor', data);
        closeModal('visitor-modal');
        showToast('Visitante salvo com sucesso', 'success');
        await loadVisitors();
    } catch(e) { alert('Erro ao salvar: ' + e.message); }
});

document.getElementById('vis-delete-btn')?.addEventListener('click', async () => {
    const id = document.getElementById('visitor-edit-id').value;
    if (!id || !confirm('Excluir este registro de visitante?')) return;
    await convexMutation('visitors:deleteVisitor', { id });
    closeModal('visitor-modal');
    showToast('Registro excluído', 'info');
    await loadVisitors();
});

// ─── MÓDULO: GESTÃO DE USUÁRIOS ──────────────────────────────────────────────

let allUsers = [];

async function loadUsers() {
    const list = document.getElementById('users-list');
    if (list) list.innerHTML = '<p class="text-emerald-700 text-sm animate-pulse">Carregando...</p>';
    try {
        allUsers = await convexQuery('users:listUsers') || [];
        renderUsers();
    } catch(e) { console.error('Erro ao carregar usuários:', e); }
}

function renderUsers() {
    const list = document.getElementById('users-list');
    if (!list) return;
    if (!allUsers.length) { list.innerHTML = '<p class="text-emerald-700 text-sm">Nenhum usuário cadastrado.</p>'; return; }
    const roleBadge = {
        sysadmin: 'bg-purple-500/20 text-purple-400',
        admin:    'bg-emerald-500/20 text-emerald-400',
        viewer:   'bg-slate-500/20 text-slate-400',
    };
    const roleLabel = { sysadmin:'🛡️ Sysadmin', admin:'⚙️ Admin', viewer:'👁️ Viewer' };
    list.innerHTML = allUsers.map(u => `
        <div class="flex items-center justify-between gap-3 bg-emerald-900/20 border border-emerald-800/30 rounded-xl px-4 py-3">
            <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-semibold text-white truncate">${u.name}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${roleBadge[u.role] || roleBadge.viewer}">${roleLabel[u.role] || u.role}</span>
                    ${!u.active ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500/20 text-red-400">Inativo</span>' : ''}
                </div>
                <p class="text-xs text-emerald-600 mt-0.5">${u.email}</p>
            </div>
            <div class="flex gap-1 shrink-0">
                <button onclick="openEditUser('${u._id}')" class="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-400 hover:bg-emerald-900/50 transition-colors" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                <button onclick="deleteUser('${u._id}')" class="p-1.5 rounded-lg text-red-700/60 hover:text-red-400 hover:bg-red-900/20 transition-colors" title="Excluir"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
            </div>
        </div>
    `).join('');
}

function showUserForm(isNew = true) {
    const wrap = document.getElementById('user-form-wrap');
    const hint = document.getElementById('usr-pass-hint');
    if (wrap) wrap.classList.remove('hidden');
    if (hint) hint.textContent = isNew ? '(obrigatória)' : '(deixe em branco para manter)';
    document.getElementById('user-form-title').textContent = isNew ? 'Novo Usuário' : 'Editar Usuário';
}

document.getElementById('new-user-btn')?.addEventListener('click', () => {
    document.getElementById('user-edit-id').value = '';
    document.getElementById('usr-name').value = '';
    document.getElementById('usr-email').value = '';
    document.getElementById('usr-password').value = '';
    document.getElementById('usr-role').value = 'viewer';
    document.getElementById('usr-active').checked = true;
    showUserForm(true);
});

function openEditUser(id) {
    const u = allUsers.find(x => x._id === id);
    if (!u) return;
    document.getElementById('user-edit-id').value = id;
    document.getElementById('usr-name').value = u.name;
    document.getElementById('usr-email').value = u.email;
    document.getElementById('usr-password').value = '';
    document.getElementById('usr-role').value = u.role;
    document.getElementById('usr-active').checked = u.active;
    showUserForm(false);
}

async function deleteUser(id) {
    if (!confirm('Excluir este usuário? Esta ação é irreversível.')) return;
    try {
        await convexMutation('users:deleteUser', { id });
        showToast('Usuário excluído', 'info');
        await loadUsers();
    } catch(e) { alert('Erro ao excluir: ' + e.message); }
}

document.getElementById('usr-cancel-btn')?.addEventListener('click', () => {
    document.getElementById('user-form-wrap')?.classList.add('hidden');
});

document.getElementById('usr-save-btn')?.addEventListener('click', async () => {
    const id       = document.getElementById('user-edit-id').value;
    const name     = document.getElementById('usr-name').value.trim();
    const email    = document.getElementById('usr-email').value.trim();
    const pass     = document.getElementById('usr-password').value;
    const role     = document.getElementById('usr-role').value;
    const active   = document.getElementById('usr-active').checked;

    if (!name || !email) { alert('Preencha nome e e-mail.'); return; }
    if (!id && !pass) { alert('A senha é obrigatória para novos usuários.'); return; }

    try {
        let passwordHash = undefined;
        if (pass) passwordHash = await hashPassword(pass);

        if (id) {
            const upd = { id, name, role, active };
            if (passwordHash) upd.passwordHash = passwordHash;
            await convexMutation('users:updateUser', upd);
        } else {
            await convexMutation('users:createUser', { name, email, passwordHash, role });
        }
        document.getElementById('user-form-wrap')?.classList.add('hidden');
        showToast('Usuário salvo com sucesso', 'success');
        await loadUsers();
    } catch(e) { alert('Erro ao salvar: ' + e.message); }
});

document.getElementById('users-modal-close')?.addEventListener('click', () => closeModal('users-modal'));
document.getElementById('users-modal-backdrop')?.addEventListener('click', () => closeModal('users-modal'));

document.getElementById('drawer-users-btn')?.addEventListener('click', () => {
    closeDrawer();
    document.getElementById('user-form-wrap')?.classList.add('hidden');
    openModal('users-modal');
    loadUsers();
});

// ─── SINCRONIZA ADMIN COM MÓDULOS ─────────────────────────────────────────────
// Sobrescreve setAdminMode para também atualizar botões dos módulos

const _origSetAdminMode = setAdminMode;
// já atualiza admin-only buttons na função de navegação

// ─── INICIALIZAÇÃO ────────────────────────────────────────────────────────────

window.addEventListener('load', async () => {
    console.log('AMRTS Santorini v3.0 — Carregando dados do Convex...');
    await loadFromConvex();
    // Sincroniza indicador do drawer
    const drawerUpd = document.getElementById('drawer-last-update');
    const lastUpd   = document.getElementById('last-update');
    if (drawerUpd && lastUpd) {
        const obs = new MutationObserver(() => { drawerUpd.textContent = lastUpd.textContent; });
        obs.observe(lastUpd, { childList: true, subtree: true, characterData: true });
    }
});
