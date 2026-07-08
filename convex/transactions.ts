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

type PCloudImportFileRecord = {
  _id: Id<"pcloudImportFiles">;
  fileKey: string;
  fileId?: string;
  fileName: string;
  fileHash?: string;
  fileSize?: number;
  modified?: string;
  sourceUrl: string;
  rowsImported: number;
  inserted: number;
  updated: number;
  skipped: number;
  status: "processed" | "failed";
  error?: string;
  importedAt: number;
};

type AssociateRecord = {
  _id: Id<"associates">;
  name: string;
  unit?: string;
  status: "ativo" | "inativo" | "inadimplente";
};

const MANUAL_ASSOCIATE_PAYMENT_ALIASES = [
  {
    associateNameIncludes: "amilton",
    paymentNames: ["Amilton", "MACPELA EMP IMOBILIARIOS LTDA", "MACPELA"],
  },
];

const PAYMENT_PREFIX_PATTERN = /^(pix|ted|doc|transferencia|transferência|transf|pagamento|pagto)\s+/i;

function stripPaymentPrefix(value: string) {
  return value.replace(PAYMENT_PREFIX_PATTERN, "").trim();
}

function normalizeAssociateName(value: string) {
  return stripPaymentPrefix(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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

// Retorna todos os nomes de pagamento associados a um associado:
// nome principal + aliases hardcoded + payerNames cadastrados no banco
function getAssociatePaymentNames(associate: Pick<AssociateRecord, "name"> & { payerNames?: string[] }) {
  const associateName = normalizeAssociateName(associate.name);
  const aliases = MANUAL_ASSOCIATE_PAYMENT_ALIASES
    .filter((rule) => associateName.includes(normalizeAssociateName(rule.associateNameIncludes)))
    .flatMap((rule) => rule.paymentNames);
  return [...new Set([associate.name, ...aliases, ...(associate.payerNames ?? [])])];
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
    // Apenas sysadmin pode importar transações
    await requireRole(ctx.db, sessionToken, "sysadmin");

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
    await requireRole(ctx.db, sessionToken, "sysadmin");
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
    await requireRole(ctx.db, sessionToken, "sysadmin");
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

export const getPCloudImportFiles = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireRole(ctx.db, sessionToken, "sysadmin");
    return await ctx.db.query("pcloudImportFiles").withIndex("by_imported_at").order("desc").collect();
  },
});

export const markPCloudImportFile = mutation({
  args: {
    sessionToken: v.string(),
    fileKey: v.string(),
    fileId: v.optional(v.string()),
    fileName: v.string(),
    fileHash: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    modified: v.optional(v.string()),
    sourceUrl: v.string(),
    rowsImported: v.number(),
    inserted: v.number(),
    updated: v.number(),
    skipped: v.number(),
    status: v.union(v.literal("processed"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.sessionToken, "sysadmin");
    const importedAt = Date.now();
    const existing = await ctx.db
      .query("pcloudImportFiles")
      .withIndex("by_file_key", (q) => q.eq("fileKey", args.fileKey))
      .first() as PCloudImportFileRecord | null;

    const payload = {
      fileKey: args.fileKey,
      fileId: args.fileId,
      fileName: args.fileName,
      fileHash: args.fileHash,
      fileSize: args.fileSize,
      modified: args.modified,
      sourceUrl: args.sourceUrl,
      rowsImported: args.rowsImported,
      inserted: args.inserted,
      updated: args.updated,
      skipped: args.skipped,
      status: args.status,
      error: args.error,
      importedAt,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return { id: existing._id, updated: true, importedAt };
    }

    const id = await ctx.db.insert("pcloudImportFiles", payload);
    return { id, updated: false, importedAt };
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
    const received = [
      ...(await ctx.db.query("transactions").withIndex("by_detail", (q) => q.eq("detail", "Recebido")).collect()),
      ...(await ctx.db.query("transactions").withIndex("by_detail", (q) => q.eq("detail", "Depósito InfinitePay")).collect())
    ];
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
    if (!associateId || !sessionToken) return null;

    const caller = await requireRole(ctx.db, sessionToken, "associado");
    if (caller.role === "associado" && String(caller.associateId ?? "") !== String(associateId)) {
      throw new Error("Você só pode consultar o histórico financeiro do seu próprio vínculo de associado.");
    }

    const associate = await ctx.db.get(associateId);
    if (!associate || associate.status !== "ativo") return null;

    const received = [
      ...(await ctx.db.query("transactions").withIndex("by_detail", (q) => q.eq("detail", "Recebido")).collect()),
      ...(await ctx.db.query("transactions").withIndex("by_detail", (q) => q.eq("detail", "Depósito InfinitePay")).collect())
    ].filter((t) => !t.deletedAt);
    
    // Combina nome principal + aliases hardcoded + payerNames do banco
    const userTxs = received
      .filter((t) => matchesAssociateName(t.name, getAssociatePaymentNames(associate)))
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
    
    const total = userTxs.reduce((acc, t) => acc + t.value, 0);
    const months = new Set(userTxs.map((t) => t.date.slice(0, 7))).size;

    // Lógica cumulativa para paidThisMonth baseada em R$ 50,00/mês
    const MONTHLY_FEE = 50;
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const [currYear, currMonth] = currentMonthKey.split("-").map(Number);
    
    let startMonthKey = associate.joinedAt ? associate.joinedAt.slice(0, 7) : null;
    if (!startMonthKey && userTxs.length > 0) {
      const oldestTx = [...userTxs].sort((a, b) => a.date.localeCompare(b.date))[0];
      startMonthKey = oldestTx.date.slice(0, 7);
    }

    let paidThisMonth = false;
    if (startMonthKey) {
      const [startYear, startMonth] = startMonthKey.split("-").map(Number);
      const monthsActive = (currYear - startYear) * 12 + (currMonth - startMonth) + 1;
      const expectedCumulative = Math.max(0, monthsActive) * MONTHLY_FEE;
      const paidCumulative = userTxs.reduce((acc, t) => acc + t.value, 0);
      paidThisMonth = paidCumulative >= expectedCumulative;
    } else {
      // Se não há histórico nenhum nem data de adesão, assume não pago
      paidThisMonth = false;
    }

    return {
      name: associate.name,
      unit: associate.unit ?? null,
      total,
      monthsActive: months,
      lastDate: userTxs[0]?.date ?? "",
      paidThisMonth,
      transactions: userTxs,
    };
  },
});

export const getDefaulters = query({
  args: {
    sessionToken: v.string(),
    monthKey: v.string(), // formato "YYYY-MM"
  },
  handler: async (ctx, { sessionToken, monthKey }) => {
    // Exige papel diretoria ou superior
    await requireRole(ctx.db, sessionToken, "diretoria");

    const activeAssociates = await ctx.db
      .query("associates")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
    const candidates = activeAssociates.filter((a) => a.status === "ativo");

    const allReceived = [
      ...(await ctx.db.query("transactions").withIndex("by_detail", (q) => q.eq("detail", "Recebido")).collect()),
      ...(await ctx.db.query("transactions").withIndex("by_detail", (q) => q.eq("detail", "Depósito InfinitePay")).collect())
    ].filter((t) => !t.deletedAt);

    const [refYear, refMonth] = monthKey.split("-").map(Number);
    const lastDayOfMonth = new Date(refYear, refMonth, 0).getDate();
    const endOfReferenceMonthStr = `${monthKey}-${String(lastDayOfMonth).padStart(2, "0")}`;

    const MONTHLY_FEE = 50;
    const defaulters = [];

    for (const assoc of candidates) {
      const paymentNames = getAssociatePaymentNames(assoc);
      
      let startMonthKey = assoc.joinedAt ? assoc.joinedAt.slice(0, 7) : null;
      const assocTxs = allReceived.filter((t) => matchesAssociateName(t.name, paymentNames));
      
      if (!startMonthKey) {
        if (assocTxs.length > 0) {
          const oldestTx = [...assocTxs].sort((a, b) => a.date.localeCompare(b.date))[0];
          startMonthKey = oldestTx.date.slice(0, 7);
        } else {
          startMonthKey = monthKey;
        }
      }

      // Se o associado aderiu após o mês selecionado, ignora
      if (startMonthKey.localeCompare(monthKey) > 0) {
        continue;
      }

      const [startYear, startMonth] = startMonthKey.split("-").map(Number);
      const monthsActive = (refYear - startYear) * 12 + (refMonth - startMonth) + 1;
      const expectedCumulative = Math.max(0, monthsActive) * MONTHLY_FEE;

      const paidCumulative = assocTxs
        .filter((t) => t.date.localeCompare(endOfReferenceMonthStr) <= 0)
        .reduce((acc, t) => acc + t.value, 0);

      const balance = paidCumulative - expectedCumulative;
      const lastPayment = [...assocTxs].sort((a, b) => b.date.localeCompare(a.date))[0];

      if (balance < 0) {
        const totalOverdueValue = Math.abs(balance);
        const monthsOverdue = Math.ceil(totalOverdueValue / MONTHLY_FEE);
        
        defaulters.push({
          associateId: assoc._id,
          name: assoc.name,
          unit: assoc.unit ?? "Sem Unidade",
          monthsOverdue,
          totalOverdueValue,
          lastPaymentDate: lastPayment?.date ?? null,
          joinedAt: assoc.joinedAt ?? startMonthKey + "-01",
        });
      }
    }

    // Ordenar por meses em atraso DESC, depois por unidade ASC
    return defaulters.sort((a, b) => b.monthsOverdue - a.monthsOverdue || a.unit.localeCompare(b.unit));
  },
});

export const getPublicAssociateHistory = query({
  args: {
    cpfPrefix4: v.string(),
  },
  handler: async (ctx, { cpfPrefix4 }) => {
    // Verificar se o recurso de extrato público está ativo
    const setting = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", "public_extratos_ativo"))
      .first();
    const isPublicEnabled = setting ? setting.enabled : true;
    if (!isPublicEnabled) {
      return { success: false, error: "A consulta pública de extrato está temporariamente desativada por motivos de segurança." };
    }

    const prefix = cpfPrefix4.replace(/\D/g, "");
    if (prefix.length < 4) {
      return { success: false, error: "O prefixo/código deve ter pelo menos 4 dígitos." };
    }

    // Buscar todos os associados não deletados
    const associates = await ctx.db.query("associates").collect();
    const activeAssociates = associates.filter((a) => a.deletedAt === undefined && a.status === "ativo");

    // Encontrar o associado que corresponde aos 4 primeiros dígitos do CPF
    const matched = activeAssociates.find((a) => {
      const cleanedCpf = a.cpf ? a.cpf.replace(/\D/g, "") : "";
      const cleanedPrefix = a.cpfPrefix ? a.cpfPrefix.replace(/\D/g, "") : "";
      return cleanedCpf.startsWith(prefix) || cleanedPrefix.startsWith(prefix);
    });

    if (!matched) {
      return { success: false, error: "Nenhum associado ativo encontrado com esse prefixo." };
    }

    const received = [
      ...(await ctx.db.query("transactions").withIndex("by_detail", (q) => q.eq("detail", "Recebido")).collect()),
      ...(await ctx.db.query("transactions").withIndex("by_detail", (q) => q.eq("detail", "Depósito InfinitePay")).collect())
    ];
    const userTxs = received
      .filter((t) => matchesAssociateName(t.name, getAssociatePaymentNames(matched)))
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

    const total = userTxs.reduce((acc, t) => acc + t.value, 0);
    const months = new Set(userTxs.map((t) => t.date.slice(0, 7))).size;

    const yearlyTotals: Record<string, number> = {};
    for (const t of userTxs) {
      const year = t.date.slice(0, 4);
      yearlyTotals[year] = (yearlyTotals[year] || 0) + t.value;
    }

    return {
      success: true,
      associate: {
        name: matched.name,
        unit: matched.unit ?? null,
        total,
        monthsActive: months,
        lastDate: userTxs[0]?.date ?? null,
        paidThisMonth: userTxs.some((t) => t.date.startsWith(new Date().toISOString().slice(0, 7))),
        yearlyTotals,
        transactions: userTxs.map((t) => ({
          _id: t._id,
          date: t.date,
          time: t.time,
          value: t.value,
          detail: t.detail,
        })),
      }
    };
  },
});

export const updateTransaction = mutation({
  args: {
    sessionToken: v.string(),
    id: v.id("transactions"),
    name: v.string(),
    value: v.number(),
  },
  handler: async (ctx, { sessionToken, id, name, value }) => {
    await requireRole(ctx.db, sessionToken, "sysadmin");

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Transação não encontrada.");
    }

    const formattedOriginalValue = `${value >= 0 ? "+" : "-"}R$ ${Math.abs(value).toFixed(2).replace(".", ",")}`;
    await ctx.db.patch(id, {
      name: stripPaymentPrefix(name),
      value,
      originalValue: formattedOriginalValue,
    });

    return { success: true };
  },
});
