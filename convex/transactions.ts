import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./_lib";
import type { Id } from "./_generated/dataModel";

type TransactionRecord = {
  _id: Id<"transactions">;
  date: string;
  time: string;
  type: string;
  name: string;
  detail: string;
  value: number;
  originalValue: string;
  transactionKey: string;
  importedAt: number;
  deletedAt?: number;
};

const PAYMENT_PREFIX_PATTERN = /^(pix|ted|doc|transferencia|transferência|transf|pagamento|pagto)\s+/i;

function stripPaymentPrefix(value: string) {
  return value.replace(PAYMENT_PREFIX_PATTERN, "").trim();
}

function normalizeAssociateName(value: string) {
  return stripPaymentPrefix(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function hasPaymentPrefix(value: string) {
  return PAYMENT_PREFIX_PATTERN.test(value.trim());
}

function normalizeOriginalValue(value: string) {
  return value.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
}

function buildNormalizedTransactionKey(tx: Pick<TransactionRecord, "date" | "time" | "value" | "originalValue" | "name">) {
  const rawValue = normalizeOriginalValue(tx.originalValue) || String(tx.value);
  return `${tx.date}_${tx.time}_${rawValue}_${stripPaymentPrefix(tx.name)}`;
}

function buildLegacyTransactionKey(tx: Pick<TransactionRecord, "date" | "time" | "value" | "originalValue" | "name">) {
  const rawValue = normalizeOriginalValue(tx.originalValue) || String(tx.value);
  return `${tx.date}_${tx.time}_${rawValue}_${tx.name}`;
}

function buildDuplicateGroupKey(tx: Pick<TransactionRecord, "date" | "time" | "value" | "detail" | "name">) {
  return [tx.date, tx.time, tx.value.toFixed(2), tx.detail, normalizeAssociateName(tx.name)].join("|");
}

function chooseCanonicalTransaction(group: TransactionRecord[]) {
  return [...group].sort((a, b) => {
    const aPrefixed = hasPaymentPrefix(a.name);
    const bPrefixed = hasPaymentPrefix(b.name);
    if (aPrefixed !== bPrefixed) return aPrefixed ? 1 : -1;
    if (a.importedAt !== b.importedAt) return a.importedAt - b.importedAt;
    return a.transactionKey.localeCompare(b.transactionKey);
  })[0];
}

function summarizeDuplicateGroups(all: TransactionRecord[]) {
  const grouped = new Map<string, TransactionRecord[]>();
  for (const tx of all.filter((item) => !item.deletedAt)) {
    const key = buildDuplicateGroupKey(tx);
    grouped.set(key, [...(grouped.get(key) ?? []), tx]);
  }

  return [...grouped.values()]
    .filter((group) => {
      if (group.length <= 1) return false;
      const hasPrefixedName = group.some((tx) => hasPaymentPrefix(tx.name));
      const uniqueKeys = new Set(group.map((tx) => tx.transactionKey));
      return hasPrefixedName || uniqueKeys.size < group.length;
    })
    .map((group) => {
      const keep = chooseCanonicalTransaction(group);
      const duplicates = group.filter((tx) => tx._id !== keep._id);
      return {
        groupKey: buildDuplicateGroupKey(keep),
        normalizedName: normalizeAssociateName(keep.name),
        date: keep.date,
        time: keep.time,
        value: keep.value,
        detail: keep.detail,
        keep: {
          id: keep._id,
          name: keep.name,
          transactionKey: keep.transactionKey,
          importedAt: keep.importedAt,
        },
        duplicates: duplicates.map((tx) => ({
          id: tx._id,
          name: tx.name,
          transactionKey: tx.transactionKey,
          importedAt: tx.importedAt,
        })),
      };
    })
    .filter((group) => group.duplicates.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
}

function matchesAssociateName(transactionName: string, possibleNames: string[]) {
  const txName = normalizeAssociateName(transactionName);
  return possibleNames.some((rawName) => {
    const name = normalizeAssociateName(rawName);
    return name.length >= 3 && (txName === name || txName.includes(name) || name.includes(txName));
  });
}

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
    let updated = 0;
    let skipped = 0;
    const importedAt = Date.now();
    for (const tx of transactions) {
      const normalizedKey = buildNormalizedTransactionKey({ ...tx, importedAt });
      const legacyKey = buildLegacyTransactionKey({ ...tx, importedAt });
      const candidateKeys = [...new Set([tx.transactionKey, normalizedKey, legacyKey])];

      let existing: TransactionRecord | null = null;
      for (const candidateKey of candidateKeys) {
        existing = await ctx.db
          .query("transactions")
          .withIndex("by_key", (q) => q.eq("transactionKey", candidateKey))
          .first();
        if (existing) break;
      }

      if (existing) {
        // Upsert: atualiza nome, chave e dados se o registro já existe (ex: reimport com nomes reais)
        const sanitizedName = stripPaymentPrefix(tx.name);
        const patch: Partial<Pick<TransactionRecord, "name" | "type" | "originalValue" | "transactionKey">> = {};
        if (existing.name !== sanitizedName) patch.name = sanitizedName;
        if (existing.type !== tx.type) patch.type = tx.type;
        if (existing.originalValue !== tx.originalValue) patch.originalValue = tx.originalValue;
        if (existing.transactionKey !== normalizedKey) patch.transactionKey = normalizedKey;
        if (Object.keys(patch).length > 0) {
          await ctx.db.patch(existing._id, patch);
          updated++;
        } else {
          skipped++;
        }
        continue;
      }
      await ctx.db.insert("transactions", { ...tx, name: stripPaymentPrefix(tx.name), transactionKey: normalizedKey, importedAt });
      inserted++;
    }
    return { inserted, updated, skipped, total: transactions.length };
  },
});

export const previewPaymentPrefixDuplicates = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireRole(ctx.db, sessionToken, "diretoria");
    const all = await ctx.db.query("transactions").collect();
    const groups = summarizeDuplicateGroups(all);
    return {
      groups,
      duplicateCount: groups.reduce((total, group) => total + group.duplicates.length, 0),
      groupCount: groups.length,
    };
  },
});

export const cleanupPaymentPrefixDuplicates = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireRole(ctx.db, sessionToken, "diretoria");
    const all = await ctx.db.query("transactions").collect();
    const groups = summarizeDuplicateGroups(all);
    const duplicateIds = groups.flatMap((group) => group.duplicates.map((duplicate) => duplicate.id));

    for (const duplicateId of duplicateIds) {
      await ctx.db.delete(duplicateId);
    }

    return {
      deleted: duplicateIds.length,
      groupCount: groups.length,
      groups,
    };
  },
});

// ─── LIMPAR TODAS AS TRANSAÇÕES ───────────────────────────────────────────────
// Apaga todo o histórico — usar antes de reimportar CSV com dados corrigidos.
export const clearAllTransactions = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("transactions").collect();
    await Promise.all(all.map((t) => ctx.db.delete(t._id)));
    return { deleted: all.length };
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
    const contributors = new Set(received.map((t) => normalizeAssociateName(t.name)));
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
    const totals: Record<string, { name: string; total: number }> = {};
    for (const t of received) {
      const normalizedName = normalizeAssociateName(t.name);
      const displayName = stripPaymentPrefix(t.name);
      totals[normalizedName] = {
        name: totals[normalizedName]?.name ?? displayName,
        total: (totals[normalizedName]?.total ?? 0) + t.value,
      };
    }
    return Object.values(totals).sort((a, b) => b.total - a.total).slice(0, limit);
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
  args: {
    search: v.string(),
    associateId: v.optional(v.id("associates")),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, { associateId, sessionToken }) => {
    // Regra de privacidade: histórico financeiro só pode ser resolvido por vínculo
    // explícito de associado e por uma sessão autenticada. Diretoria/Sysadmin podem
    // consultar qualquer associado; Associado só pode consultar o próprio vínculo.
    if (!associateId || !sessionToken) return null;

    const caller = await requireRole(ctx.db, sessionToken, "associado");
    if (caller.role === "associado" && String(caller.associateId ?? "") !== String(associateId)) {
      throw new Error("Você só pode consultar o histórico financeiro do seu próprio vínculo de associado.");
    }

    const associate = await ctx.db.get(associateId);
    if (!associate || associate.status !== "ativo") return null;

    const received = await ctx.db.query("transactions").withIndex("by_detail", (q) => q.eq("detail", "Recebido")).collect();
    const userTxs = received
      .filter((t) => matchesAssociateName(t.name, [associate.name]))
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
    if (!userTxs.length) return null;
    const total = userTxs.reduce((acc, t) => acc + t.value, 0);
    const months = new Set(userTxs.map((t) => t.date.slice(0, 7))).size;
    return {
      name: associate.name,
      unit: associate.unit ?? null,
      total,
      monthsActive: months,
      lastDate: userTxs[0].date,
      paidThisMonth: userTxs.some((t) => t.date.startsWith(new Date().toISOString().slice(0, 7))),
      transactions: userTxs,
    };
  },
});

export const getDefaulters = query({
  args: { monthKey: v.string() },
  handler: async (ctx, { monthKey }) => {
    const activeAssociates = await ctx.db.query("associates").withIndex("by_status", (q) => q.eq("status", "ativo")).collect();
    const monthTxs = await ctx.db.query("transactions").withIndex("by_detail", (q) => q.eq("detail", "Recebido")).collect();
    const paidThisMonth = new Set(monthTxs.filter((t) => t.date.startsWith(monthKey)).map((t) => normalizeAssociateName(t.name)));
    const allReceived = await ctx.db.query("transactions").withIndex("by_detail", (q) => q.eq("detail", "Recebido")).collect();
    return activeAssociates.filter((a) => !paidThisMonth.has(normalizeAssociateName(a.name))).map((a) => {
      const lastPayment = allReceived.filter((t) => matchesAssociateName(t.name, [a.name])).sort((x, y) => y.date.localeCompare(x.date))[0];
      return { id: a._id, name: a.name, unit: a.unit, status: a.status, lastPaymentDate: lastPayment?.date ?? null };
    }).sort((a, b) => (a.unit ?? "").localeCompare(b.unit ?? ""));
  },
});
