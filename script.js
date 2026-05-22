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

/**
 * Executa uma query no Convex via HTTP API.
 */
async function convexQuery(functionPath, args = {}) {
    const response = await fetch(`${CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: functionPath, args })
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Convex query error (${functionPath}): ${err}`);
    }
    const data = await response.json();
    return data.value;
}

/**
 * Executa uma mutation no Convex via HTTP API.
 */
async function convexMutation(functionPath, args = {}) {
    const response = await fetch(`${CONVEX_URL}/api/mutation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: functionPath, args })
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Convex mutation error (${functionPath}): ${err}`);
    }
    const data = await response.json();
    return data.value;
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

const getTransactionKey = (t) =>
    `${t.date}|${t.time}|${t.name}|${t.value}|${t.detail}`.toLowerCase();

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
        lastUpdate.innerHTML = `<span class="text-red-400 text-xs">⚠ Erro Convex: ${message}</span>`;
    }
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

                    const result = await convexMutation('transactions:importTransactions', { transactions });

                    console.log(`Resultado: ${result.inserted} inseridas, ${result.skipped} duplicatas ignoradas.`);
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

    // ── Top Contribuintes ──
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
                labels: top5.map(t => t[0]),
                datasets: [{ label: 'Total Contribuído', data: top5.map(t => t[1]), backgroundColor: colors.success, borderRadius: 4 }]
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
                <div class="text-xs sm:text-sm font-medium text-slate-200">${t.name}</div>
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

function renderUserPortal(transactions) {
    const name  = transactions[0].name;
    const total = transactions.reduce((acc, t) => acc + t.value, 0);
    const months = new Set(transactions.map(t => getMonthKey(t.date))).size;
    const lastDate = transactions[0].date;

    document.getElementById('portal-user-name').textContent  = name;
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
        + toExport.map(t => `${t.date},${t.time},${t.name},${t.type},${t.detail},${t.value}`).join("\n");
    const link = Object.assign(document.createElement("a"), { href: encodeURI(csv), download: "amrts_relatorio.csv" });
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// ── Importar CSV ──
bindOptional('import-csv-btn', 'click', () => {
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

document.getElementById('portal-search-btn')?.addEventListener('click', () => {
    const search = document.getElementById('portal-search-input')?.value.trim().toLowerCase() || '';
    if (!search) return;

    const userTxs = appState.rawTransactions.filter(t => t.value > 0 && t.name.toLowerCase().includes(search));

    if (!userTxs.length) {
        document.getElementById('portal-error')?.classList.remove('hidden');
        return;
    }

    document.getElementById('portal-error')?.classList.add('hidden');
    document.getElementById('portal-search-step')?.classList.add('hidden');
    document.getElementById('portal-results-step')?.classList.remove('hidden');
    renderUserPortal(userTxs);
});

// ─── AUTENTICAÇÃO MOCKADA ─────────────────────────────────────────────────────
// Temporário — substituir por autenticação real na Fase 2

const ADMIN_CREDENTIALS = {
    email: 'zrhans@gmail.com',
    password: 'S3msenha'
};

const adminModal       = document.getElementById('admin-modal');
const adminControls    = document.getElementById('admin-controls');
const adminLoginBtn    = document.getElementById('admin-login-btn');
const adminLogoutBtn   = document.getElementById('admin-logout-btn');
const adminModalClose  = document.getElementById('admin-modal-close');
const adminConfirmBtn  = document.getElementById('admin-login-confirm');
const adminEmailInput  = document.getElementById('admin-email');
const adminPassInput   = document.getElementById('admin-password');
const adminLoginError  = document.getElementById('admin-login-error');

function setAdminMode(isAdmin) {
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
        sessionStorage.setItem('adminSession', '1');
    } else {
        adminControls?.classList.add('hidden');
        adminControls?.classList.remove('flex');
        adminLoginBtn?.classList.remove('hidden');
        adminControlsMob?.classList.add('hidden');
        adminControlsMob?.classList.remove('flex');
        adminLoginBtnMob?.classList.remove('hidden');
        sessionStorage.removeItem('adminSession');
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

adminConfirmBtn?.addEventListener('click', () => {
    const email = adminEmailInput?.value.trim();
    const pass  = adminPassInput?.value;

    if (email === ADMIN_CREDENTIALS.email && pass === ADMIN_CREDENTIALS.password) {
        adminModal?.classList.add('hidden');
        setAdminMode(true);
    } else {
        adminLoginError?.classList.remove('hidden');
        if (adminPassInput) adminPassInput.value = '';
        adminPassInput?.focus();
    }
});

// Permitir Enter para confirmar login
adminPassInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') adminConfirmBtn?.click();
});

adminLogoutBtn?.addEventListener('click', () => setAdminMode(false));

// Restaurar sessão admin se já estava logado
if (sessionStorage.getItem('adminSession') === '1') {
    setAdminMode(true);
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
        ['import-csv-btn-mob',         'import-csv-btn'],
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

// Botões admin dentro do drawer
document.getElementById('drawer-admin-login-btn')?.addEventListener('click', () => {
    closeDrawer();
    document.getElementById('admin-login-btn')?.click();
});
document.getElementById('drawer-admin-logout-btn')?.addEventListener('click', () => {
    closeDrawer();
    document.getElementById('admin-logout-btn')?.click();
});
document.getElementById('drawer-import-csv-btn')?.addEventListener('click', () => {
    closeDrawer();
    document.getElementById('import-csv-btn')?.click();
});

// ─── NAVEGAÇÃO DE MÓDULOS ─────────────────────────────────────────────────────

let currentModule = 'financeiro';
const moduleLoaded = { financeiro: true, comunicados: false, documentos: false, assembleias: false };

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

// ─── SINCRONIZA ADMIN COM MÓDULOS ─────────────────────────────────────────────
// Sobrescreve setAdminMode para também atualizar botões dos módulos

const _origSetAdminMode = setAdminMode;
// já atualiza admin-only buttons na função de navegação

// ─── INICIALIZAÇÃO ────────────────────────────────────────────────────────────

window.addEventListener('load', async () => {
    console.log('AMRTS Santorini v2.0 — Carregando dados do Convex...');
    await loadFromConvex();
    // Sincroniza indicador do drawer
    const drawerUpd = document.getElementById('drawer-last-update');
    const lastUpd   = document.getElementById('last-update');
    if (drawerUpd && lastUpd) {
        const obs = new MutationObserver(() => { drawerUpd.textContent = lastUpd.textContent; });
        obs.observe(lastUpd, { childList: true, subtree: true, characterData: true });
    }
});
