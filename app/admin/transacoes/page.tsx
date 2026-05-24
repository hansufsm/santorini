/**
 * admin/transacoes/page.tsx — Importação de transações via CSV e listagem
 *
 * O CSV exportado pelo InfinitePay tem colunas separadas por vírgula ou ponto-e-vírgula.
 * O parser aqui suporta ambos e trata campos com aspas.
 */
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useConvexQuery, convexMutation } from "@/lib/convex";
import { formatCurrency, formatDate } from "@/lib/utils";

type Transaction = {
  _id?: string;
  date: string;
  time: string;
  type: string;
  name: string;
  detail: string;
  value: number;
  originalValue?: string;
  transactionKey?: string;
};

type AssociateOption = {
  _id: string;
  name: string;
  unit?: string;
  status: "ativo" | "inativo" | "inadimplente";
};

type AssociateHistory = {
  name: string;
  unit?: string | null;
  total: number;
  monthsActive: number;
  lastDate: string;
  paidThisMonth: boolean;
  transactions: Transaction[];
} | null;

type PaymentPrefixDuplicateGroup = {
  groupKey: string;
  normalizedName: string;
  date: string;
  time: string;
  value: number;
  detail: string;
  keep: {
    id: string;
    name: string;
    transactionKey: string;
    importedAt: number;
  };
  duplicates: Array<{
    id: string;
    name: string;
    transactionKey: string;
    importedAt: number;
  }>;
};

type PaymentPrefixDuplicatesPreview = {
  groups: PaymentPrefixDuplicateGroup[];
  duplicateCount: number;
  groupCount: number;
};

type ImportResult = {
  inserted: number;
  updated: number;
  skipped: number;
  total?: number;
};

type CleanupResult = {
  deleted: number;
  groupCount: number;
};

function DesktopRecommendedNotice({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-sky-400/25 bg-sky-950/30 px-4 py-3 text-sm text-sky-100/80 ${className}`}>
      <strong className="text-sky-100">Melhor em Desktop/Laptop PC:</strong> a tabela completa possui várias colunas e é exibida no desktop. No celular, use os cartões otimizados para leitura rápida.
    </div>
  );
}

function TransactionMobileCard({ tx, variant = "default" }: { tx: Transaction; variant?: "default" | "preview" }) {
  const isIncome = tx.value >= 0;
  return (
    <article className="rounded-2xl border border-gray-800 bg-gray-950/45 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/70">{formatDate(tx.date)}</p>
          <p className="mt-1 truncate text-sm font-bold text-white">{tx.name || "Sem nome"}</p>
        </div>
        <div className="text-right">
          <p className={`whitespace-nowrap text-base font-black ${isIncome ? "text-emerald-400" : "text-red-400"}`}>{formatCurrency(tx.value)}</p>
          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${isIncome ? "bg-emerald-400/10 text-emerald-200" : "bg-red-400/10 text-red-200"}`}>
            {isIncome ? "Entrada" : "Saída"}
          </span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400">
        <div className="rounded-lg bg-gray-900/70 px-3 py-2">
          <span className="block text-gray-500">Hora</span>
          <span className="font-medium text-gray-200">{tx.time?.slice(0, 5) || "—"}</span>
        </div>
        <div className="rounded-lg bg-gray-900/70 px-3 py-2">
          <span className="block text-gray-500">Tipo</span>
          <span className="font-medium text-gray-200">{tx.type || (variant === "preview" ? "Preview" : "—")}</span>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-gray-400">{tx.detail || "Sem detalhe informado."}</p>
    </article>
  );
}

// Parser CSV simples — suporta vírgula e ponto-e-vírgula como separadores,
// e campos entre aspas duplas
function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const sep = lines[0]?.includes(";") ? ";" : ",";

  return lines.map((line) => {
    const fields: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === sep && !inQuotes) { fields.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    fields.push(cur.trim());
    return fields;
  });
}

function stripPaymentPrefix(value: string) {
  return value.replace(/^(pix|ted|doc|transferencia|transferência|transf|pagamento|pagto)\s+/i, "").trim();
}

// Mapeia uma linha CSV para o formato de transação esperado pelo Convex
// Ajuste os índices conforme o cabeçalho do seu CSV do InfinitePay
function mapRow(headers: string[], row: string[]): Transaction | null {
  const get = (name: string) => {
    const i = headers.findIndex((h) => h.toLowerCase().includes(name.toLowerCase()));
    return i >= 0 ? row[i] ?? "" : "";
  };

  // Tenta extrair valor numérico (formato brasileiro: "1.234,56" ou "-1234.56")
  const rawValue = get("valor").replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const value = parseFloat(rawValue);
  if (isNaN(value)) return null;

  const rawName = get("nome");
  const normalizedName = stripPaymentPrefix(rawName);

  // Gerar chave única se não houver coluna específica. A chave derivada usa o nome
  // sem prefixos de meio de pagamento para impedir duplicatas como "Pix NOME" e "NOME".
  const key = get("chave") || get("key") || get("id") || `${get("data")}_${get("hora")}_${rawValue}_${normalizedName}`;

  return {
    date: get("data"),
    time: get("hora"),
    type: get("tipo"),
    name: normalizedName,
    detail: get("detalhe") || get("descri"),
    value,
    originalValue: get("valor"),
    transactionKey: key,
  };
}

export default function TransacoesPage() {
  const { session } = useAuth();

  // Lista de transações existentes
  const { data: txList, loading: listLoading } = useConvexQuery<Transaction[]>("transactions:getAllTransactions");
  const { data: associates, loading: associatesLoading } = useConvexQuery<AssociateOption[]>("associates:getAllAssociates");

  // Estado do import
  const [preview, setPreview] = useState<Transaction[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssociateId, setSelectedAssociateId] = useState("");

  const selectedAssociate = associates?.find((associate) => associate._id === selectedAssociateId);
  const { data: associateHistory, loading: historyLoading, error: historyError } = useConvexQuery<AssociateHistory>(
    "transactions:getAssociateHistory",
    { search: "", associateId: selectedAssociateId || undefined, sessionToken: session?.token ?? "" },
    !session || !selectedAssociateId
  );
  const selectedTransactions = associateHistory?.transactions ?? [];
  const { data: duplicatePreview, loading: duplicatesLoading } = useConvexQuery<PaymentPrefixDuplicatesPreview>(
    "transactions:previewPaymentPrefixDuplicates",
    { sessionToken: session?.token ?? "" },
    !session
  );
  const duplicateGroups = duplicatePreview?.groups ?? [];
  const duplicateCount = duplicatePreview?.duplicateCount ?? 0;

  if (!session) return null;

  // Ler o arquivo CSV e montar preview
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreview([]);
    setResult(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) {
        setError("CSV inválido ou vazio.");
        return;
      }
      const headers = rows[0];
      const mapped = rows.slice(1).map((r) => mapRow(headers, r)).filter(Boolean) as Transaction[];
      setPreview(mapped);
    };
    reader.readAsText(file, "UTF-8");
  }

  // Enviar ao Convex
  async function handleImport() {
    if (!preview.length || !session) return;
    setImporting(true);
    setError(null);
    try {
      const res = await convexMutation<ImportResult>(
        "transactions:importTransactions",
        { transactions: preview, sessionToken: session.token }
      );
      setResult(res);
      setPreview([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao importar");
    } finally {
      setImporting(false);
    }
  }

  async function handleCleanupPaymentPrefixDuplicates() {
    if (!session || duplicateCount === 0) return;
    const confirmed = window.confirm(
      `Foram encontradas ${duplicateCount} transação(ões) duplicada(s) em ${duplicatePreview?.groupCount ?? 0} grupo(s). Deseja remover as duplicatas e manter apenas o registro canônico de cada grupo?`
    );
    if (!confirmed) return;

    setCleaningDuplicates(true);
    setError(null);
    setCleanupResult(null);
    try {
      const res = await convexMutation<CleanupResult>(
        "transactions:cleanupPaymentPrefixDuplicates",
        { sessionToken: session.token }
      );
      setCleanupResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao limpar duplicatas por prefixo Pix");
    } finally {
      setCleaningDuplicates(false);
    }
  }

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-xl font-bold text-white">Transações</h2>
        <p className="text-sm text-gray-400 mt-1">Importe o extrato CSV do InfinitePay para registrar as contribuições</p>
      </div>

      {/* Upload CSV */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-medium text-gray-300">Importar CSV</h3>

        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-xl p-6 sm:p-8 cursor-pointer hover:border-emerald-600 transition-colors">
          <span className="text-sm font-black text-white">Selecionar arquivo CSV</span>
          <span className="mt-2 text-center text-sm text-gray-400">{fileName || "Toque aqui para selecionar o extrato exportado"}</span>
          <span className="mt-3 rounded-full border border-emerald-700/50 px-3 py-1 text-xs text-emerald-200/75">Compatível com Android</span>
          <input
            type="file"
            className="sr-only"
            onChange={handleFile}
          />
        </label>
        <p className="text-xs leading-relaxed text-gray-500">
          No Android, alguns gerenciadores de arquivos ocultam `.csv` quando o seletor restringe extensões. Por isso, o seletor foi liberado para exibir todos os arquivos; a importação continua validando o conteúdo antes do preview.
        </p>

        {/* Preview */}
        {preview.length > 0 && (
          <div>
            <p className="text-sm text-gray-300 mb-2">{preview.length} transação(ões) encontrada(s) no arquivo</p>
            <div className="hidden max-h-56 overflow-auto rounded-lg border border-gray-700 md:block">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-800">
                  <tr>
                    {["Data", "Nome", "Detalhe", "Valor"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 20).map((tx, i) => (
                    <tr key={i} className="border-t border-gray-800 hover:bg-gray-800/30">
                      <td className="px-3 py-1.5 text-gray-300">{formatDate(tx.date)}</td>
                      <td className="px-3 py-1.5 text-gray-300 max-w-32 truncate">{tx.name}</td>
                      <td className="px-3 py-1.5 text-gray-400">{tx.detail}</td>
                      <td className={`px-3 py-1.5 font-medium ${tx.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatCurrency(tx.value)}
                      </td>
                    </tr>
                  ))}
                  {preview.length > 20 && (
                    <tr><td colSpan={4} className="px-3 py-2 text-gray-500 text-center">... e mais {preview.length - 20} registros</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 md:hidden">
              <DesktopRecommendedNotice />
              {preview.slice(0, 8).map((tx, i) => (
                <TransactionMobileCard key={i} tx={tx} variant="preview" />
              ))}
              {preview.length > 8 && (
                <p className="text-center text-xs text-gray-500">... e mais {preview.length - 8} registro(s) no preview</p>
              )}
            </div>

            <button
              onClick={handleImport}
              disabled={importing}
              className="mt-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg text-sm transition-colors"
            >
              {importing ? "Importando…" : `Confirmar Importação (${preview.length} registros)`}
            </button>
          </div>
        )}

        {result && (
          <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg p-4 text-sm">
            <p className="text-emerald-300 font-medium">Importação concluída</p>
            <p className="text-gray-300 mt-1">{result.inserted} inseridos &nbsp;·&nbsp; {result.updated} atualizados &nbsp;·&nbsp; {result.skipped} duplicados ignorados</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-300">{error}</div>
        )}
      </div>

      {/* Correção de duplicatas por prefixo de pagamento */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-300">Correção de duplicatas Pix</h3>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-500">
              Esta rotina procura transações com a mesma data, hora, valor, detalhe e nome normalizado, tratando prefixos como Pix, TED, DOC e Pagamento como variações do mesmo pagador. Antes de apagar, a tela mostra quais registros serão mantidos e quais serão removidos.
            </p>
          </div>
          <button
            onClick={handleCleanupPaymentPrefixDuplicates}
            disabled={duplicatesLoading || cleaningDuplicates || duplicateCount === 0}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cleaningDuplicates ? "Limpando…" : duplicateCount > 0 ? `Remover ${duplicateCount} duplicata(s)` : "Nenhuma duplicata"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
            <p className="mt-1 text-sm font-semibold text-white">{duplicatesLoading ? "Verificando…" : duplicateCount > 0 ? "Ação recomendada" : "Sem duplicatas"}</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Grupos afetados</p>
            <p className="mt-1 text-sm font-semibold text-white">{duplicatesLoading ? "—" : duplicatePreview?.groupCount ?? 0}</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Duplicatas removíveis</p>
            <p className="mt-1 text-sm font-semibold text-amber-300">{duplicatesLoading ? "—" : duplicateCount}</p>
          </div>
        </div>

        {cleanupResult && (
          <div className="rounded-lg border border-emerald-700 bg-emerald-900/30 p-4 text-sm">
            <p className="font-medium text-emerald-300">Limpeza concluída</p>
            <p className="mt-1 text-gray-300">{cleanupResult.deleted} duplicata(s) removida(s) em {cleanupResult.groupCount} grupo(s).</p>
          </div>
        )}

        {duplicateGroups.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-gray-800">
            <div className="hidden max-h-72 overflow-auto md:block">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-800">
                  <tr>
                    {['Data', 'Nome normalizado', 'Manter', 'Remover', 'Valor'].map((header) => (
                      <th key={header} className="px-3 py-2 text-left text-gray-400">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {duplicateGroups.slice(0, 20).map((group) => (
                    <tr key={group.groupKey} className="border-t border-gray-800 hover:bg-gray-800/30">
                      <td className="px-3 py-2 text-gray-300">{formatDate(group.date)} {group.time?.slice(0, 5)}</td>
                      <td className="px-3 py-2 text-gray-300">{group.normalizedName}</td>
                      <td className="px-3 py-2 text-emerald-300">{group.keep.name}</td>
                      <td className="px-3 py-2 text-amber-300">{group.duplicates.map((duplicate) => duplicate.name).join(', ')}</td>
                      <td className="px-3 py-2 font-medium text-gray-200">{formatCurrency(group.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 p-3 md:hidden">
              {duplicateGroups.slice(0, 8).map((group) => (
                <article key={group.groupKey} className="rounded-xl border border-gray-800 bg-gray-950/50 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">{formatDate(group.date)} · {formatCurrency(group.value)}</p>
                  <p className="mt-2 text-gray-300">Manter: <span className="font-medium text-emerald-300">{group.keep.name}</span></p>
                  <p className="mt-1 text-gray-400">Remover: {group.duplicates.map((duplicate) => duplicate.name).join(', ')}</p>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Histórico por associado */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-300">Histórico por usuário/associado</h3>
            <p className="text-xs text-gray-500 mt-1">
              Selecione um associado no combobox para consultar suas transações recebidas em tabela.
            </p>
          </div>
          <div className="w-full lg:w-96">
            <label className="block text-xs text-gray-400 mb-1">Associado</label>
            <select
              value={selectedAssociateId}
              onChange={(event) => setSelectedAssociateId(event.target.value)}
              disabled={associatesLoading}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-60"
            >
              <option value="">{associatesLoading ? "Carregando associados…" : "Selecione para consultar"}</option>
              {(associates ?? []).map((associate) => (
                <option key={associate._id} value={associate._id}>
                  {associate.name}{associate.unit ? ` — Unidade ${associate.unit}` : ""}{associate.status !== "ativo" ? ` (${associate.status})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!selectedAssociateId ? (
          <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-4 text-sm text-gray-500">
            Nenhum associado selecionado para consulta.
          </div>
        ) : historyLoading ? (
          <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-4 text-sm text-gray-400">
            Carregando histórico de {selectedAssociate?.name ?? "associado"}…
          </div>
        ) : historyError ? (
          <div className="rounded-lg border border-red-700 bg-red-900/30 p-4 text-sm text-red-300">
            {historyError}
          </div>
        ) : !associateHistory || selectedTransactions.length === 0 ? (
          <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-4 text-sm text-gray-500">
            Nenhuma transação recebida encontrada para {selectedAssociate?.name ?? "este associado"}.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Associado</p>
                <p className="mt-1 text-sm font-medium text-white">{associateHistory.name}</p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Total recebido</p>
                <p className="mt-1 text-sm font-bold text-emerald-400">{formatCurrency(associateHistory.total)}</p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Meses ativos</p>
                <p className="mt-1 text-sm font-bold text-white">{associateHistory.monthsActive}</p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Último pagamento</p>
                <p className="mt-1 text-sm font-bold text-white">{formatDate(associateHistory.lastDate)}</p>
              </div>
            </div>

            <div className="hidden overflow-x-auto rounded-lg border border-gray-800 md:block">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr className="text-gray-400 text-xs uppercase">
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-left px-4 py-3">Hora</th>
                    <th className="text-left px-4 py-3">Tipo</th>
                    <th className="text-left px-4 py-3">Nome no extrato</th>
                    <th className="text-right px-4 py-3">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTransactions.map((tx, index) => (
                    <tr key={tx._id ?? `${tx.date}-${tx.time}-${index}`} className="border-t border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-4 py-2 text-gray-300">{formatDate(tx.date)}</td>
                      <td className="px-4 py-2 text-gray-400">{tx.time?.slice(0, 5) || "—"}</td>
                      <td className="px-4 py-2 text-gray-400">{tx.detail || tx.type}</td>
                      <td className="px-4 py-2 text-gray-300 max-w-56 truncate">{tx.name}</td>
                      <td className="px-4 py-2 text-right font-medium text-emerald-400">{formatCurrency(tx.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 md:hidden">
              <DesktopRecommendedNotice />
              {selectedTransactions.map((tx, index) => (
                <TransactionMobileCard key={tx._id ?? `${tx.date}-${tx.time}-${index}`} tx={tx} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Lista de transações */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-medium text-gray-300">📋 Transações Registradas</h3>
        </div>

        {listLoading ? (
          <div className="p-6 text-center text-gray-400 text-sm">Carregando…</div>
        ) : !txList || txList.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">Nenhuma transação importada ainda.</div>
        ) : (
          <div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr className="text-gray-400 text-xs uppercase">
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-left px-4 py-3">Nome</th>
                    <th className="text-left px-4 py-3">Tipo</th>
                    <th className="text-right px-4 py-3">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {txList.slice(0, 100).map((tx, i) => (
                    <tr key={i} className="border-t border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-4 py-2 text-gray-300">{formatDate(tx.date)}</td>
                      <td className="px-4 py-2 text-gray-300 max-w-48 truncate">{tx.name}</td>
                      <td className="px-4 py-2 text-gray-400">{tx.detail}</td>
                      <td className={`px-4 py-2 text-right font-medium ${tx.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatCurrency(tx.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 p-4 md:hidden">
              <DesktopRecommendedNotice />
              {txList.slice(0, 30).map((tx, i) => (
                <TransactionMobileCard key={tx._id ?? `${tx.date}-${tx.name}-${i}`} tx={tx} />
              ))}
            </div>
            {txList.length > 100 && (
              <p className="text-center text-gray-500 text-xs py-3">Exibindo 100 de {txList.length} registros no desktop</p>
            )}
            {txList.length > 30 && (
              <p className="text-center text-gray-500 text-xs pb-3 md:hidden">Exibindo 30 de {txList.length} cartões no celular</p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
