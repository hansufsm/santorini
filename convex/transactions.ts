import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./auth";

export const importTransactions = mutation({
  args: {
    sessionToken: v.string(),
    transactions: v.array(v.object({
      date: v.string(),
      time: v.string(),
      type: v.string(),
      name: v.string(),
      detail: v.string(),
      value: v.number(),
      originalValue: v.string(),
      transactionKey: v.string(),
    })),
  },
  handler: async (ctx, { sessionToken, transactions }) => {
    // Apenas diretoria ou sysadmin podem importar transações
    await requireRole(ctx.db, sessionToken, "diretoria");

    let inserted = 0;
    let skipped = 0;
    const importedAt = Date.now();
    for (const tx of transactions) {
      const existing = await ctx.db
        .query("transactions")
        .withIndex("by_key", (q) => q.eq("transactionKey", tx.transactionKey))
        .first();
      if (existing) { skipped++; continue; }
      await ctx.db.insert("transactions", { ...tx, importedAt });
      inserted++;
    }
    return { inserted, skipped, total: transactions.length };
  },
});

export const getAllTransactions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("transactions").withIndex("by_date").order("desc").collect();
  },
});

export const getAvailableMonths = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("transactions").collect();
    const months = [...new Set(all.map((t) => t.date.slice(0, 7)))];
    return months.sort().reverse();
  },
});

export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("transactions").collect();
    const received = all.filter((t) => t.value > 0);
    const sent = all.filter((t) => t.value < 0);
    const totalReceived = received.reduce((acc, t) => acc + t.value, 0);
    const totalSent = Math.abs(sent.reduce((acc, t) => acc + t.value, 0));
    const contributors = new Set(received.map((t) => t.name));
    return {
      totalReceived, totalSent,
      netBalance: totalReceived - totalSent,
      contributorsCount: contributors.size,
      receivedCount: received.length,
      sentCount: sent.length,
      totalTransactions: all.length,
    };
  },
});

export const getTopContributors = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 5 }) => {
    const received = await ctx.db.query("transactions").withIndex("by_detail", (q) => q.eq("detail", "Recebido")).collect();
    const totals: Record<string, number> = {};
    for (const t of received) { totals[t.name] = (totals[t.name] || 0) + t.value; }
    return Object.entries(totals).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, limit);
  },
});

export const getMonthlyFlow = query({
  args: { months: v.optional(v.number()) },
  handler: async (ctx, { months }) => {
    const all = await ctx.db.query("transactions").withIndex("by_date").order("asc").collect();
    const flowMap: Record<string, { received: number; sent: number }> = {};
    for (const t of all) {
      const key = t.date.slice(0, 7);
      if (!flowMap[key]) flowMap[key] = { received: 0, sent: 0 };
      if (t.value > 0) flowMap[key].received += t.value;
      else flowMap[key].sent += Math.abs(t.value);
    }
    let result = Object.entries(flowMap).map(([month, data]) => ({ month, ...data })).sort((a, b) => a.month.localeCompare(b.month));
    if (months) result = result.slice(-months);
    return result;
  },
});

export const getAssociateHistory = query({
  args: { search: v.string() },
  handler: async (ctx, { search }) => {
    const term = search.toLowerCase().trim();
    const received = await ctx.db.query("transactions").withIndex("by_detail", (q) => q.eq("detail", "Recebido")).collect();
    const userTxs = received.filter((t) => t.name.toLowerCase().includes(term)).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
    if (!userTxs.length) return null;
    const total = userTxs.reduce((acc, t) => acc + t.value, 0);
    const months = new Set(userTxs.map((t) => t.date.slice(0, 7))).size;
    return { name: userTxs[0].name, total, monthsActive: months, lastDate: userTxs[0].date, transactions: userTxs };
  },
});

export const getDefaulters = query({
  args: { monthKey: v.string() },
  handler: async (ctx, { monthKey }) => {
    const activeAssociates = await ctx.db.query("associates").withIndex("by_status", (q) => q.eq("status", "ativo")).collect();
    const monthTxs = await ctx.db.query("transactions").withIndex("by_detail", (q) => q.eq("detail", "Recebido")).collect();
    const paidThisMonth = new Set(monthTxs.filter((t) => t.date.startsWith(monthKey)).map((t) => t.name.toLowerCase()));
    const allReceived = await ctx.db.query("transactions").withIndex("by_detail", (q) => q.eq("detail", "Recebido")).collect();
    return activeAssociates.filter((a) => !paidThisMonth.has(a.name.toLowerCase())).map((a) => {
      const lastPayment = allReceived.filter((t) => t.name.toLowerCase().includes(a.name.toLowerCase())).sort((x, y) => y.date.localeCompare(x.date))[0];
      return { id: a._id, name: a.name, unit: a.unit, status: a.status, lastPaymentDate: lastPayment?.date ?? null };
    }).sort((a, b) => (a.unit ?? "").localeCompare(b.unit ?? ""));
  },
});
