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
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                ${formatDateBR(t.date)}<div class="text-xs opacity-50">${t.time}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm font-medium text-slate-200">${t.name}</div>
                <div class="text-xs text-slate-500">${t.type}</div>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${t.value > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}">
                    ${t.detail}
                </span>
            </td>
            <td class="px-6 py-4 text-right whitespace-nowrap text-sm font-mono ${t.value > 0 ? 'text-emerald-400' : 'text-red-400'}">
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
            <td class="px-6 py-4 text-sm font-bold text-emerald-300" colspan="2">Subtotais do mês</td>
            <td class="px-6 py-4 text-xs text-emerald-500/90 space-y-1">
                <div>Recebidos (${cntR})</div><div>Enviados (${cntS})</div>
                <div class="font-semibold text-emerald-300 pt-1 border-t border-emerald-800/40">Saldo</div>
            </td>
            <td class="px-6 py-4 text-right text-sm font-mono font-semibold space-y-1">
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
            <td class="px-6 py-4">${formatDateBR(t.date)}</td>
            <td class="px-6 py-4">${t.type}</td>
            <td class="px-6 py-4 text-right font-mono text-emerald-400">+${formatCurrency(t.value)}</td>`;
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

// ─── PAINEL DO ASSOCIADO ──────────────────────────────────────────────────────

// ── Utilitários de sessão ──
function getAssocSession() {
    try { return JSON.parse(sessionStorage.getItem('associadoSession') || 'null'); }
    catch { return null; }
}
function setAssocSession(data) {
    if (data) sessionStorage.setItem('associadoSession', JSON.stringify(data));
    else sessionStorage.removeItem('associadoSession');
}

// ── Helpers de UI ──
function showAssocLogin() {
    document.getElementById('assoc-auth-screen')?.classList.remove('hidden');
    document.getElementById('assoc-portal-content')?.classList.add('hidden');
    document.getElementById('assoc-logout-btn')?.classList.add('hidden');
    document.getElementById('assoc-logout-btn')?.classList.remove('flex');
    const cpfInput = document.getElementById('assoc-cpf-input');
    if (cpfInput) cpfInput.value = '';
    document.getElementById('assoc-login-error')?.classList.add('hidden');
}

function showAssocPortal(session) {
    document.getElementById('assoc-auth-screen')?.classList.add('hidden');
    document.getElementById('assoc-portal-content')?.classList.remove('hidden');
    const logoutBtn = document.getElementById('assoc-logout-btn');
    logoutBtn?.classList.remove('hidden');
    logoutBtn?.classList.add('flex');

    // Preenche cabeçalho
    document.getElementById('assoc-portal-name').textContent = `Olá, ${session.name.split(' ')[0]}!`;
    if (session.unit) document.getElementById('assoc-portal-unit').textContent = `Unidade ${session.unit}`;
    const statusCfg = {
        ativo:        { cls: 'bg-emerald-500/20 text-emerald-400', label: 'Ativo' },
        inadimplente: { cls: 'bg-yellow-500/20 text-yellow-400',   label: 'Inadimplente' },
        inativo:      { cls: 'bg-red-500/20 text-red-400',         label: 'Inativo' },
    };
    const sc = statusCfg[session.status] || statusCfg.ativo;
    const badge = document.getElementById('assoc-portal-status');
    if (badge) { badge.className = `px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${sc.cls}`; badge.textContent = sc.label; }
    const joinedEl = document.getElementById('assoc-portal-joined');
    if (joinedEl && session.joinedAt) {
        joinedEl.textContent = `Membro desde: ${formatDateBR(session.joinedAt)}`;
        joinedEl.classList.remove('hidden');
    }

    // Ativa aba inicial
    switchAssocTab('inicio');
}

// ── Abertura / fechamento do portal ──
document.getElementById('contributor-portal-btn')?.addEventListener('click', openAssocPortal);

function openAssocPortal() {
    const portal = document.getElementById('associado-portal');
    portal?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    const session = getAssocSession();
    if (session) showAssocPortal(session);
    else showAssocLogin();
}

function closeAssocPortal() {
    document.getElementById('associado-portal')?.classList.add('hidden');
    document.body.style.overflow = '';
}

document.getElementById('assoc-close-btn')?.addEventListener('click', closeAssocPortal);

document.getElementById('assoc-logout-btn')?.addEventListener('click', () => {
    setAssocSession(null);
    assocTabLoaded = {};
    showAssocLogin();
});

// ── Máscara CPF ──
document.getElementById('assoc-cpf-input')?.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9)      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
    else if (v.length > 3) v = v.replace(/(\d{3})(\d{0,3})/, '$1.$2');
    e.target.value = v;
});

// ── Login ──
async function doAssocLogin() {
    const raw = document.getElementById('assoc-cpf-input')?.value.replace(/\D/g, '') || '';
    const errEl = document.getElementById('assoc-login-error');
    if (raw.length !== 11) {
        errEl.textContent = 'Digite o CPF completo (11 dígitos).';
        errEl?.classList.remove('hidden'); return;
    }
    const btn = document.getElementById('assoc-login-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Verificando…'; }
    try {
        const associate = await convexQuery('associates:authenticateAssociate', { cpf: raw });
        if (!associate) {
            errEl.textContent = 'CPF não encontrado. Verifique o número ou contate a administração.';
            errEl?.classList.remove('hidden'); return;
        }
        errEl?.classList.add('hidden');
        setAssocSession(associate);
        showAssocPortal(associate);
    } catch (err) {
        console.error('Erro no login do associado:', err);
        errEl.textContent = 'Erro ao conectar. Tente novamente.';
        errEl?.classList.remove('hidden');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Acessar minha área'; }
    }
}
document.getElementById('assoc-login-btn')?.addEventListener('click', doAssocLogin);
document.getElementById('assoc-cpf-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doAssocLogin();
});

// ── Alternância de abas ──
let currentAssocTab = 'inicio';
let assocTabLoaded = {};

function switchAssocTab(name) {
    document.querySelectorAll('.assoc-tab-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById(`assoc-tab-${name}`)?.classList.remove('hidden');
    document.querySelectorAll('.assoc-tab-btn').forEach(btn => {
        const isActive = btn.dataset.assocTab === name;
        btn.classList.toggle('border-b-2',          isActive);
        btn.classList.toggle('border-emerald-400',  isActive);
        btn.classList.toggle('text-emerald-300',    isActive);
        btn.classList.toggle('font-semibold',       isActive);
        btn.classList.toggle('text-emerald-600',    !isActive);
    });
    currentAssocTab = name;
    if (!assocTabLoaded[name]) {
        assocTabLoaded[name] = true;
        const session = getAssocSession();
        if (!session) return;
        if (name === 'inicio')      renderAssocInicio(session);
        if (name === 'extrato')     loadAssocExtrato(session);
        if (name === 'mensalidade') renderAssocMensalidade(session);
        if (name === 'cadastro')    renderAssocCadastro(session);
        if (name === 'reservas')    loadAssocReservas(session);
        if (name === 'comunicados') loadAssocComunicados();
        if (name === 'suporte')     renderAssocSuporte(session);
    }
}
document.querySelectorAll('.assoc-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchAssocTab(btn.dataset.assocTab));
});

// ── ABA: INÍCIO ──
function renderAssocInicio(session) {
    const txs = appState.rawTransactions.filter(
        t => t.value > 0 && t.name.trim().toLowerCase() === session.name.trim().toLowerCase()
    ).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

    const total  = txs.reduce((s, t) => s + t.value, 0);
    const months = new Set(txs.map(t => getMonthKey(t.date))).size;
    const lastDate = txs.length ? txs[0].date : null;

    document.getElementById('assoc-stat-total').textContent   = formatCurrency(total);
    document.getElementById('assoc-stat-months').textContent  = months || '0';
    document.getElementById('assoc-stat-last').textContent    = lastDate ? formatDateBR(lastDate) : '—';

    let nextDue = '—';
    if (lastDate) {
        const mk = getMonthKey(lastDate).split('-');
        const next = new Date(Number(mk[0]), Number(mk[1]), 1); // 1st day of following month
        nextDue = `${MONTH_NAMES[next.getMonth()]}/${next.getFullYear()}`;
    }
    document.getElementById('assoc-stat-next').textContent = nextDue;

    // Gráfico (últimos 6 meses)
    const monthlyData = {};
    txs.forEach(t => { const mk = getMonthKey(t.date); monthlyData[mk] = (monthlyData[mk] || 0) + t.value; });
    const labels = Object.keys(monthlyData).sort().slice(-6);
    const mn = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    const ctx = document.getElementById('assoc-inicio-chart')?.getContext('2d');
    if (ctx) {
        if (window.assocInicioChartInst) window.assocInicioChartInst.destroy();
        window.assocInicioChartInst = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(l => { const [y,m] = l.split('-'); return `${mn[+m-1]}/${y}`; }),
                datasets: [{ label: 'Contribuição', data: labels.map(l => monthlyData[l] || 0),
                    borderColor: colors.primary, backgroundColor: 'rgba(16,185,129,0.1)',
                    fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: colors.primary }]
            },
            options: { responsive: true, maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: colors.grid }, ticks: { color: colors.slate, font: { size: 10 }, callback: v => formatCurrency(v) } },
                    x: { grid: { display: false }, ticks: { color: colors.slate, font: { size: 10 } } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
}

// ── ABA: EXTRATO ──
let assocExtratoMonthIdx = 0;
let assocExtratoTxs = [];

function loadAssocExtrato(session) {
    assocExtratoTxs = appState.rawTransactions.filter(
        t => t.value > 0 && t.name.trim().toLowerCase() === session.name.trim().toLowerCase()
    ).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
    assocExtratoMonthIdx = 0;
    // Preenche select de meses
    const months = getAvailableMonths(assocExtratoTxs);
    const sel = document.getElementById('assoc-extrato-month');
    if (sel) sel.innerHTML = months.map(m => `<option value="${m}">${formatMonthLabel(m)}</option>`).join('');
    renderAssocExtrato();
}

function renderAssocExtrato() {
    const months = getAvailableMonths(assocExtratoTxs);
    const tbody = document.getElementById('assoc-extrato-body');
    if (!months.length) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="text-center py-8 text-emerald-700">Nenhuma contribuição registrada.</td></tr>';
        return;
    }
    const month = months[Math.min(assocExtratoMonthIdx, months.length - 1)];
    const monthTxs = assocExtratoTxs.filter(t => getMonthKey(t.date) === month);
    const total = monthTxs.reduce((s, t) => s + t.value, 0);

    if (tbody) {
        tbody.innerHTML = monthTxs.map(t => `
            <tr class="hover:bg-emerald-900/10 transition-colors">
                <td class="px-4 py-3 text-xs text-emerald-300">${formatDateBR(t.date)}<div class="text-[10px] text-emerald-700">${t.time}</div></td>
                <td class="px-4 py-3 text-xs text-emerald-500 hidden sm:table-cell">${t.type}</td>
                <td class="px-4 py-3 text-right font-mono text-xs text-emerald-400 font-semibold">+${formatCurrency(t.value)}</td>
            </tr>`).join('') +
        `<tr class="bg-emerald-950/50 border-t-2 border-emerald-700/60">
            <td colspan="2" class="px-4 py-3 text-xs font-bold text-emerald-300">Total ${formatMonthLabel(month)}</td>
            <td class="px-4 py-3 text-right font-mono text-xs font-bold text-emerald-300">+${formatCurrency(total)}</td>
        </tr>`;
    }
    const label = document.getElementById('assoc-extrato-label');
    if (label) label.textContent = `${formatMonthLabel(month)} — ${monthTxs.length} transação(ões)`;
    const sel = document.getElementById('assoc-extrato-month');
    if (sel) sel.value = month;
    const prevBtn = document.getElementById('assoc-extrato-prev');
    const nextBtn = document.getElementById('assoc-extrato-next');
    if (prevBtn) prevBtn.disabled = assocExtratoMonthIdx >= months.length - 1;
    if (nextBtn) nextBtn.disabled = assocExtratoMonthIdx === 0;
}

bindOptional('assoc-extrato-prev', 'click', () => {
    const months = getAvailableMonths(assocExtratoTxs);
    if (assocExtratoMonthIdx < months.length - 1) { assocExtratoMonthIdx++; renderAssocExtrato(); }
});
bindOptional('assoc-extrato-next', 'click', () => {
    if (assocExtratoMonthIdx > 0) { assocExtratoMonthIdx--; renderAssocExtrato(); }
});
bindOptional('assoc-extrato-month', 'change', (e) => {
    const months = getAvailableMonths(assocExtratoTxs);
    const idx = months.indexOf(e.target.value);
    if (idx >= 0) { assocExtratoMonthIdx = idx; renderAssocExtrato(); }
});

// ── ABA: MENSALIDADE ──
function renderAssocMensalidade(session) {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const txs = appState.rawTransactions.filter(
        t => t.value > 0 && t.name.trim().toLowerCase() === session.name.trim().toLowerCase()
    );
    const thisMonthTx = txs.find(t => getMonthKey(t.date) === currentMonthKey);
    const paidEl  = document.getElementById('assoc-mens-paid');
    const pendEl  = document.getElementById('assoc-mens-pending');
    const monthLabel = formatMonthLabel(currentMonthKey);

    if (thisMonthTx) {
        paidEl?.classList.remove('hidden');
        pendEl?.classList.add('hidden');
        const pd = document.getElementById('assoc-mens-paid-date');
        const pv = document.getElementById('assoc-mens-paid-value');
        const pm = document.getElementById('assoc-mens-paid-month');
        if (pd) pd.textContent = formatDateBR(thisMonthTx.date);
        if (pv) pv.textContent = formatCurrency(thisMonthTx.value);
        if (pm) pm.textContent = monthLabel;
    } else {
        paidEl?.classList.add('hidden');
        pendEl?.classList.remove('hidden');
        const pendMonth = document.getElementById('assoc-mens-pending-month');
        if (pendMonth) pendMonth.textContent = monthLabel;
    }
}

// ── ABA: MEU CADASTRO ──
function renderAssocCadastro(session) {
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
    setTxt('assoc-cad-name',   session.name);
    setTxt('assoc-cad-unit',   session.unit);
    const statusMap = { ativo: 'Ativo', inadimplente: 'Inadimplente', inativo: 'Inativo' };
    setTxt('assoc-cad-status', statusMap[session.status] || session.status);
    setTxt('assoc-cad-joined', session.joinedAt ? formatDateBR(session.joinedAt) : '—');
    const emailInp = document.getElementById('assoc-cad-email');
    const phoneInp = document.getElementById('assoc-cad-phone');
    if (emailInp) emailInp.value = session.email || '';
    if (phoneInp) phoneInp.value = session.phone || '';
    document.getElementById('assoc-cad-feedback')?.classList.add('hidden');
}

document.getElementById('assoc-cadastro-save-btn')?.addEventListener('click', async () => {
    const session = getAssocSession();
    if (!session) return;
    const email = document.getElementById('assoc-cad-email')?.value.trim() || undefined;
    const phone = document.getElementById('assoc-cad-phone')?.value.trim() || undefined;
    const btn = document.getElementById('assoc-cadastro-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
    const fb = document.getElementById('assoc-cad-feedback');
    try {
        await convexMutation('associates:updateAssociateContact', { id: session._id, email, phone });
        const updated = { ...session, email: email || session.email, phone: phone || session.phone };
        setAssocSession(updated);
        if (fb) { fb.textContent = '✓ Dados salvos com sucesso.'; fb.classList.remove('hidden'); }
        showToast('Cadastro atualizado!', 'success');
    } catch (err) {
        if (fb) { fb.textContent = `Erro: ${err.message}`; fb.classList.remove('hidden'); }
        showToast('Erro ao salvar.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Salvar alterações'; }
    }
});

// ── ABA: RESERVAS ──
const AREA_LABEL = { salao:'Salão de Festas', piscina:'Piscina', churrasqueira:'Churrasqueira', quadra:'Quadra Esportiva', academia:'Academia', outro:'Outro' };
const AREA_EMOJI = { salao:'🎉', piscina:'🏊', churrasqueira:'🍖', quadra:'⚽', academia:'💪', outro:'📍' };

async function loadAssocReservas(session) {
    const list   = document.getElementById('assoc-rsv-list');
    const emptyEl = document.getElementById('assoc-rsv-empty');
    if (list) list.innerHTML = '<p class="text-emerald-700 text-sm animate-pulse">Carregando...</p>';
    try {
        const unit = session.unit || '';
        const reservations = unit ? (await convexQuery('reservations:getReservationsByUnit', { unit }) || []) : [];
        if (!reservations.length) {
            if (list) list.innerHTML = '';
            emptyEl?.classList.remove('hidden');
        } else {
            emptyEl?.classList.add('hidden');
            const statusCfg = {
                pendente:   { cls: 'bg-yellow-500/20 text-yellow-400',   label: 'Pendente' },
                confirmada: { cls: 'bg-emerald-500/20 text-emerald-400', label: 'Confirmada' },
                cancelada:  { cls: 'bg-red-500/20 text-red-400',          label: 'Cancelada' },
            };
            if (list) list.innerHTML = reservations.map(r => {
                const sc = statusCfg[r.status] || statusCfg.pendente;
                const emoji = AREA_EMOJI[r.area] || '📍';
                const label = AREA_LABEL[r.area] || r.area;
                return `<div class="bg-emerald-900/20 border border-emerald-800/30 rounded-2xl p-4">
                    <div class="flex items-start justify-between gap-2 mb-2">
                        <span class="text-sm font-semibold text-white">${emoji} ${label}</span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.cls}">${sc.label}</span>
                    </div>
                    <div class="text-xs text-emerald-600 flex flex-wrap gap-3">
                        <span>📅 ${formatDateBR(r.date)}</span>
                        <span>🕐 ${r.startTime}–${r.endTime}</span>
                    </div>
                    ${r.notes ? `<p class="text-emerald-700 text-xs mt-2 italic">${r.notes}</p>` : ''}
                </div>`;
            }).join('');
        }
    } catch (e) {
        console.error('Erro ao carregar reservas:', e);
        if (list) list.innerHTML = '<p class="text-red-400 text-sm">Erro ao carregar reservas.</p>';
    }
}

document.getElementById('assoc-rsv-submit-btn')?.addEventListener('click', async () => {
    const session = getAssocSession();
    if (!session) return;
    const area      = document.getElementById('assoc-rsv-area')?.value || '';
    const date      = document.getElementById('assoc-rsv-date')?.value || '';
    const startTime = document.getElementById('assoc-rsv-start')?.value || '';
    const endTime   = document.getElementById('assoc-rsv-end')?.value || '';
    const notes     = document.getElementById('assoc-rsv-notes')?.value.trim() || undefined;

    if (!area || !date || !startTime || !endTime) {
        showToast('Preencha área, data e horários.', 'error'); return;
    }
    if (startTime >= endTime) {
        showToast('Horário de início deve ser anterior ao término.', 'error'); return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (date < today) { showToast('A data não pode ser no passado.', 'error'); return; }

    const btn = document.getElementById('assoc-rsv-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }
    try {
        await convexMutation('reservations:createReservation', {
            area, unit: session.unit || '', residentName: session.name,
            date, startTime, endTime, status: 'pendente', notes,
        });
        showToast('Solicitação enviada! Aguarde confirmação da administração.', 'success', 5000);
        document.getElementById('assoc-rsv-area').value = '';
        document.getElementById('assoc-rsv-date').value = '';
        document.getElementById('assoc-rsv-start').value = '';
        document.getElementById('assoc-rsv-end').value = '';
        document.getElementById('assoc-rsv-notes').value = '';
        // Recarrega lista (reseta flag para forçar reload)
        assocTabLoaded['reservas'] = false;
        await loadAssocReservas(session);
        assocTabLoaded['reservas'] = true;
    } catch (err) {
        showToast('Erro ao enviar: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Enviar solicitação'; }
    }
});

// ── ABA: COMUNICADOS ──
async function loadAssocComunicados() {
    const list   = document.getElementById('assoc-ann-list');
    const emptyEl = document.getElementById('assoc-ann-empty');
    if (list) list.innerHTML = '<p class="text-emerald-700 text-sm animate-pulse">Carregando...</p>';
    try {
        const anns = (await convexQuery('announcements:getActiveAnnouncements')) || [];
        if (!anns.length) {
            if (list) list.innerHTML = '';
            emptyEl?.classList.remove('hidden');
            return;
        }
        emptyEl?.classList.add('hidden');
        const typeCfg = {
            urgente:    { emoji:'🔴', label:'Urgente',    border:'border-red-500/30',     badge:'bg-red-500/20 text-red-400' },
            info:       { emoji:'🔵', label:'Info',       border:'border-blue-500/30',    badge:'bg-blue-500/20 text-blue-400' },
            manutencao: { emoji:'🟡', label:'Manutenção', border:'border-yellow-500/30',  badge:'bg-yellow-500/20 text-yellow-400' },
            evento:     { emoji:'🟢', label:'Evento',     border:'border-emerald-500/30', badge:'bg-emerald-500/20 text-emerald-400' },
        };
        if (list) list.innerHTML = anns.map(a => {
            const cfg = typeCfg[a.type] || typeCfg.info;
            return `<div class="bg-emerald-900/20 border ${cfg.border} rounded-2xl p-4 md:p-5">
                <div class="flex items-center gap-2 mb-2 flex-wrap">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${cfg.badge}">${cfg.emoji} ${cfg.label}</span>
                </div>
                <h4 class="font-semibold text-white text-base mb-1">${a.title}</h4>
                <p class="text-emerald-200/70 text-sm leading-relaxed whitespace-pre-line">${a.content}</p>
                <p class="text-emerald-700 text-xs mt-3">${new Date(a.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>`;
        }).join('');
    } catch (e) {
        console.error('Erro ao carregar comunicados:', e);
        if (list) list.innerHTML = '<p class="text-red-400 text-sm">Erro ao carregar comunicados.</p>';
    }
}

// ── ABA: SUPORTE ──
function renderAssocSuporte(session) {
    document.getElementById('assoc-sup-title').value       = '';
    document.getElementById('assoc-sup-description').value = '';
    document.getElementById('assoc-sup-area').value        = '';
    document.getElementById('assoc-sup-priority').value    = 'media';
    document.getElementById('assoc-sup-feedback')?.classList.add('hidden');
}

document.getElementById('assoc-sup-submit-btn')?.addEventListener('click', async () => {
    const session = getAssocSession();
    if (!session) return;
    const title       = document.getElementById('assoc-sup-title')?.value.trim() || '';
    const description = document.getElementById('assoc-sup-description')?.value.trim() || undefined;
    const area        = document.getElementById('assoc-sup-area')?.value.trim() || undefined;
    const priority    = document.getElementById('assoc-sup-priority')?.value || 'media';

    if (!title || title.length < 5) { showToast('Informe um título com ao menos 5 caracteres.', 'error'); return; }

    const notes = `[Chamado via Portal] Reportado por: ${session.name}${session.unit ? ' (Unidade ' + session.unit + ')' : ''}`;
    const btn = document.getElementById('assoc-sup-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }
    try {
        await convexMutation('maintenances:createMaintenance', {
            title, description, area, priority, status: 'aberto', notes,
        });
        showToast('Chamado aberto com sucesso!', 'success');
        renderAssocSuporte(session);
        const fb = document.getElementById('assoc-sup-feedback');
        if (fb) { fb.textContent = '✓ Chamado enviado. A administração irá analisar em breve.'; fb.classList.remove('hidden'); }
    } catch (err) {
        showToast('Erro ao abrir chamado: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Enviar chamado'; }
    }
});

// ── Toast helper (simples) ──
function showToast(message, type = 'success', duration = 3500) {
    const id = 'assoc-toast-' + Date.now();
    const bg = type === 'error' ? 'bg-red-900/90 border-red-700/50 text-red-200' :
               type === 'success' ? 'bg-emerald-900/90 border-emerald-700/50 text-emerald-200' :
               'bg-slate-900/90 border-slate-700/50 text-slate-200';
    const div = document.createElement('div');
    div.id = id;
    div.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-xl border text-sm font-medium shadow-lg ${bg} transition-all`;
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), duration);
}

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
    if (isAdmin) {
        adminControls?.classList.remove('hidden');
        adminControls?.classList.add('flex');
        adminLoginBtn?.classList.add('hidden');
        sessionStorage.setItem('adminSession', '1');
    } else {
        adminControls?.classList.add('hidden');
        adminControls?.classList.remove('flex');
        adminLoginBtn?.classList.remove('hidden');
        sessionStorage.removeItem('adminSession');
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

// ─── INICIALIZAÇÃO ────────────────────────────────────────────────────────────

window.addEventListener('load', async () => {
    console.log('AMRTS Santorini v2.0 — Carregando dados do Convex...');
    await loadFromConvex();
});
