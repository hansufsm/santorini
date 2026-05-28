/**
 * admin/transacoes/page.tsx — Importação de transações via CSV e listagem
 *
 * O CSV exportado pelo InfinitePay tem colunas separadas por vírgula ou ponto-e-vírgula.
 * O parser aqui suporta ambos e trata campos com aspas.
 */
"use client";

import { useEffect, useState } from "react";
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

type PCloudProcessedFile = {
  _id: string;
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

type PCloudApiFile = {
  fileId: string;
  fileName: string;
  fileHash?: string;
  fileSize?: number;
  modified?: string;
  content: string;
  skippedBySize?: boolean;
};

type PCloudApiResponse = {
  sourceUrl: string;
  folderName: string;
  fileCount: number;
  files: PCloudApiFile[];
  error?: string;
};

type PCloudFilePreview = PCloudApiFile & {
  fileKey: string;
  transactions: Transaction[];
  alreadyProcessed: boolean;
  parseError?: string;
};

type PCloudSyncResult = {
  filesProcessed: number;
  rows: number;
  inserted: number;
  updated: number;
  skipped: number;
};

const DEFAULT_PCLOUD_FOLDER_URL = "https://u.pcloud.link/publink/show?code=kZ8V7I5Z6xQw6zTf7sp39QtML5sJDkzrP8xV";
const TRANSACTIONS_PAGE_SIZE = 50;

function buildPCloudFileKey(file: Pick<PCloudApiFile, "fileId" | "fileName" | "fileHash" | "fileSize" | "modified">) {
  return [file.fileId || file.fileName, file.fileHash || file.fileSize || file.modified || "sem-hash"].join(":");
}

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
  const { data: txList, loading: listLoading, reload: reloadTransactions } = useConvexQuery<Transaction[]>("transactions:getAllTransactions");
  const { data: associates, loading: associatesLoading } = useConvexQuery<AssociateOption[]>("associates:getAllAssociates");

  // Estado do import
  const [preview, setPreview] = useState<Transaction[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pcloudSourceMode, setPcloudSourceMode] = useState<"public" | "api">("public");
  const [pcloudUrl, setPcloudUrl] = useState(DEFAULT_PCLOUD_FOLDER_URL);
  const [pcloudFolderId, setPcloudFolderId] = useState("");
  const [pcloudSourceUrl, setPcloudSourceUrl] = useState(DEFAULT_PCLOUD_FOLDER_URL);
  const [pcloudChecking, setPcloudChecking] = useState(false);
  const [pcloudImporting, setPcloudImporting] = useState(false);
  const [pcloudFiles, setPcloudFiles] = useState<PCloudFilePreview[]>([]);
  const [pcloudFolderName, setPcloudFolderName] = useState("");
  const [pcloudResult, setPcloudResult] = useState<PCloudSyncResult | null>(null);
  const [selectedAssociateId, setSelectedAssociateId] = useState("");
  const [transactionsPage, setTransactionsPage] = useState(1);

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
  const { data: pcloudProcessedFiles, loading: pcloudHistoryLoading, reload: reloadPCloudProcessedFiles } = useConvexQuery<PCloudProcessedFile[]>(
    "transactions:getPCloudImportFiles",
    { sessionToken: session?.token ?? "" },
    !session
  );
  const duplicateGroups = duplicatePreview?.groups ?? [];
  const duplicateCount = duplicatePreview?.duplicateCount ?? 0;
  const pcloudProcessedKeys = new Set((pcloudProcessedFiles ?? []).filter((file) => file.status === "processed").map((file) => file.fileKey));
  const pcloudReadyFiles = pcloudFiles.filter((file) => file.transactions.length > 0 && !file.alreadyProcessed && !file.parseError && !file.skippedBySize);
  const pcloudReprocessableFiles = pcloudFiles.filter((file) => file.transactions.length > 0 && !file.parseError && !file.skippedBySize);
  const transactionCount = txList?.length ?? 0;
  const totalTransactionPages = Math.max(1, Math.ceil(transactionCount / TRANSACTIONS_PAGE_SIZE));
  const safeTransactionsPage = Math.min(transactionsPage, totalTransactionPages);
  const paginatedTransactions = (txList ?? []).slice(
    (safeTransactionsPage - 1) * TRANSACTIONS_PAGE_SIZE,
    safeTransactionsPage * TRANSACTIONS_PAGE_SIZE
  );
  const transactionStart = transactionCount === 0 ? 0 : (safeTransactionsPage - 1) * TRANSACTIONS_PAGE_SIZE + 1;
  const transactionEnd = Math.min(safeTransactionsPage * TRANSACTIONS_PAGE_SIZE, transactionCount);

  useEffect(() => {
    if (transactionsPage > totalTransactionPages) setTransactionsPage(totalTransactionPages);
  }, [transactionsPage, totalTransactionPages]);

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
      setTransactionsPage(1);
      reloadTransactions();
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
      setTransactionsPage(1);
      reloadTransactions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao limpar duplicatas por prefixo Pix");
    } finally {
      setCleaningDuplicates(false);
    }
  }

  async function handleCheckPCloudFolder() {
    const isApiMode = pcloudSourceMode === "api";
    if (!isApiMode && !pcloudUrl.trim()) {
      setError("Informe o link público da pasta pCloud.");
      return;
    }

    setPcloudChecking(true);
    setPcloudResult(null);
    setPcloudFiles([]);
    setPcloudFolderName("");
    setError(null);
    try {
      const response = await fetch(isApiMode ? "/api/pcloud-api" : "/api/pcloud-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isApiMode
          ? { folderId: pcloudFolderId.trim() || undefined, sessionToken: session.token }
          : { url: pcloudUrl.trim(), sessionToken: session.token }
        ),
      });
      const data = await response.json() as PCloudApiResponse;
      if (!response.ok) throw new Error(data.error || "Erro ao consultar pasta pCloud.");

      const mappedFiles = data.files.map((file) => {
        const fileKey = buildPCloudFileKey(file);
        if (file.skippedBySize) {
          return { ...file, fileKey, transactions: [], alreadyProcessed: pcloudProcessedKeys.has(fileKey), parseError: "Arquivo acima do limite de 5 MB." };
        }

        const rows = parseCSV(file.content);
        if (rows.length < 2) {
          return { ...file, fileKey, transactions: [], alreadyProcessed: pcloudProcessedKeys.has(fileKey), parseError: "CSV vazio ou sem linhas de dados." };
        }

        const headers = rows[0];
        const transactions = rows.slice(1).map((row) => mapRow(headers, row)).filter(Boolean) as Transaction[];
        return {
          ...file,
          fileKey,
          transactions,
          alreadyProcessed: pcloudProcessedKeys.has(fileKey),
          parseError: transactions.length === 0 ? "Nenhuma transação válida foi encontrada no CSV." : undefined,
        };
      });

      setPcloudSourceUrl(data.sourceUrl || (isApiMode ? "pcloud-api" : pcloudUrl.trim()));
      setPcloudFolderName(data.folderName);
      setPcloudFiles(mappedFiles);
      if (!mappedFiles.length) {
        setError(isApiMode ? "Nenhum arquivo .csv foi encontrado na pasta autenticada do pCloud." : "Nenhum arquivo .csv foi encontrado na pasta pública do pCloud.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao consultar pasta pCloud");
    } finally {
      setPcloudChecking(false);
    }
  }

  async function handleImportPCloudFiles(reprocess = false) {
    if (!session) return;
    const filesToImport = (reprocess ? pcloudReprocessableFiles : pcloudReadyFiles);
    if (!filesToImport.length) return;

    if (reprocess) {
      const confirmed = window.confirm("Reprocessar arquivos já registrados pode atualizar transações existentes, mas a deduplicação continuará ativa. Deseja continuar?");
      if (!confirmed) return;
    }

    setPcloudImporting(true);
    setPcloudResult(null);
    setError(null);
    const totals: PCloudSyncResult = { filesProcessed: 0, rows: 0, inserted: 0, updated: 0, skipped: 0 };

    try {
      for (const file of filesToImport) {
        const importRes = await convexMutation<ImportResult>(
          "transactions:importTransactions",
          { transactions: file.transactions, sessionToken: session.token }
        );

        await convexMutation(
          "transactions:markPCloudImportFile",
          {
            sessionToken: session.token,
            fileKey: file.fileKey,
            fileId: file.fileId,
            fileName: file.fileName,
            fileHash: file.fileHash,
            fileSize: file.fileSize,
            modified: file.modified,
            sourceUrl: pcloudSourceUrl,
            rowsImported: file.transactions.length,
            inserted: importRes.inserted,
            updated: importRes.updated,
            skipped: importRes.skipped,
            status: "processed",
          }
        );

        totals.filesProcessed += 1;
        totals.rows += file.transactions.length;
        totals.inserted += importRes.inserted;
        totals.updated += importRes.updated;
        totals.skipped += importRes.skipped;
      }

      setPcloudResult(totals);
      setPcloudFiles((current) => current.map((file) => filesToImport.some((processed) => processed.fileKey === file.fileKey) ? { ...file, alreadyProcessed: true } : file));
      setTransactionsPage(1);
      reloadTransactions();
      reloadPCloudProcessedFiles();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao importar arquivos do pCloud");
    } finally {
      setPcloudImporting(false);
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


      {/* Sincronização pCloud */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-300">Sincronizar CSVs do pCloud</h3>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-500">
              Lê arquivos `.csv` do pCloud, aplica a mesma sanitização de nomes Pix da importação manual e registra cada arquivo processado para evitar cargas repetidas. A API autenticada é a rota principal; o link público continua disponível como fallback.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href="/api/pcloud-oauth/start"
              className="rounded-lg border border-sky-500/60 px-4 py-2 text-center text-sm font-medium text-sky-100 transition-colors hover:bg-sky-500/10"
            >
              Conectar pCloud
            </a>
            <button
              onClick={handleCheckPCloudFolder}
              disabled={pcloudChecking || pcloudImporting}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pcloudChecking ? "Verificando…" : pcloudSourceMode === "api" ? "Verificar API" : "Verificar pasta"}
            </button>
            <button
              onClick={() => handleImportPCloudFiles(false)}
              disabled={pcloudImporting || pcloudReadyFiles.length === 0}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pcloudImporting ? "Importando…" : `Importar novos (${pcloudReadyFiles.length})`}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <label className={`cursor-pointer rounded-xl border p-4 transition-colors ${pcloudSourceMode === "api" ? "border-emerald-500/70 bg-emerald-950/20" : "border-gray-800 bg-gray-950/40 hover:border-gray-700"}`}>
            <div className="flex items-start gap-3">
              <input
                type="radio"
                checked={pcloudSourceMode === "api"}
                onChange={() => setPcloudSourceMode("api")}
                className="mt-1 accent-emerald-500"
              />
              <div>
                <p className="text-sm font-semibold text-white">API pCloud autenticada</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  Usa OAuth2 e variáveis da Vercel. Informe o folderid apenas se ele não estiver configurado em <code className="text-gray-300">PCLOUD_FOLDER_ID</code>.
                </p>
              </div>
            </div>
            <input
              value={pcloudFolderId}
              onChange={(event) => setPcloudFolderId(event.target.value)}
              disabled={pcloudSourceMode !== "api"}
              placeholder="folderid opcional, se não estiver na Vercel"
              className="mt-3 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          <label className={`cursor-pointer rounded-xl border p-4 transition-colors ${pcloudSourceMode === "public" ? "border-sky-500/70 bg-sky-950/20" : "border-gray-800 bg-gray-950/40 hover:border-gray-700"}`}>
            <div className="flex items-start gap-3">
              <input
                type="radio"
                checked={pcloudSourceMode === "public"}
                onChange={() => setPcloudSourceMode("public")}
                className="mt-1 accent-sky-500"
              />
              <div>
                <p className="text-sm font-semibold text-white">Repositório dos extratos</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  Fallback por link público da pasta. Não precisa de login nem segredo pCloud.
                </p>
              </div>
            </div>
            <input
              value={pcloudUrl}
              onChange={(event) => setPcloudUrl(event.target.value)}
              disabled={pcloudSourceMode !== "public"}
              placeholder="https://u.pcloud.link/publink/show?code=..."
              className="mt-3 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-4 text-xs leading-relaxed text-gray-500">
          <p>
            Redirect URI registrada: <code className="text-gray-300">https://santorni.org.br/api/pcloud-oauth/callback</code>. Na Vercel, configure <code className="text-gray-300">PCLOUD_CLIENT_ID</code>, <code className="text-gray-300">PCLOUD_CLIENT_SECRET</code>, <code className="text-gray-300">PCLOUD_API_HOST</code> e <code className="text-gray-300">PCLOUD_FOLDER_ID</code> para uma conexão persistente.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Pasta</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{pcloudFolderName || "Não verificada"}</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">CSVs encontrados</p>
            <p className="mt-1 text-sm font-semibold text-white">{pcloudFiles.length}</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Novos para importar</p>
            <p className="mt-1 text-sm font-semibold text-emerald-300">{pcloudReadyFiles.length}</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-950/50 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Histórico</p>
            <p className="mt-1 text-sm font-semibold text-white">{pcloudHistoryLoading ? "Carregando…" : `${pcloudProcessedFiles?.length ?? 0} arquivo(s)`}</p>
          </div>
        </div>

        {pcloudResult && (
          <div className="rounded-lg border border-emerald-700 bg-emerald-900/30 p-4 text-sm">
            <p className="font-medium text-emerald-300">Sincronização concluída</p>
            <p className="mt-1 text-gray-300">
              {pcloudResult.filesProcessed} arquivo(s), {pcloudResult.rows} linha(s): {pcloudResult.inserted} inseridos, {pcloudResult.updated} atualizados e {pcloudResult.skipped} ignorados.
            </p>
          </div>
        )}

        {pcloudFiles.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-gray-800">
            <div className="hidden max-h-72 overflow-auto md:block">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-800">
                  <tr>
                    {['Arquivo', 'Modificado', 'Linhas válidas', 'Status'].map((header) => (
                      <th key={header} className="px-3 py-2 text-left text-gray-400">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pcloudFiles.map((file) => (
                    <tr key={file.fileKey} className="border-t border-gray-800 hover:bg-gray-800/30">
                      <td className="px-3 py-2 text-gray-300">{file.fileName}</td>
                      <td className="px-3 py-2 text-gray-400">{file.modified || "—"}</td>
                      <td className="px-3 py-2 text-gray-300">{file.transactions.length}</td>
                      <td className={`px-3 py-2 font-medium ${file.parseError ? "text-red-300" : file.alreadyProcessed ? "text-amber-300" : "text-emerald-300"}`}>
                        {file.parseError || (file.alreadyProcessed ? "Já processado" : "Novo")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 p-3 md:hidden">
              {pcloudFiles.map((file) => (
                <article key={file.fileKey} className="rounded-xl border border-gray-800 bg-gray-950/50 p-3 text-sm">
                  <p className="font-medium text-gray-200">{file.fileName}</p>
                  <p className="mt-1 text-xs text-gray-500">{file.transactions.length} linha(s) válidas · {file.modified || "sem data"}</p>
                  <p className={`mt-2 text-xs font-semibold ${file.parseError ? "text-red-300" : file.alreadyProcessed ? "text-amber-300" : "text-emerald-300"}`}>
                    {file.parseError || (file.alreadyProcessed ? "Já processado" : "Novo")}
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}

        {pcloudReprocessableFiles.length > 0 && pcloudReadyFiles.length === 0 && (
          <button
            onClick={() => handleImportPCloudFiles(true)}
            disabled={pcloudImporting}
            className="rounded-lg border border-amber-600/60 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-600/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reprocessar arquivos já registrados
          </button>
        )}
      </section>

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
            <div className="flex flex-col gap-3 border-b border-gray-800 bg-gray-950/30 px-4 py-3 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Exibindo {transactionStart}–{transactionEnd} de {transactionCount} registro(s)
              </span>
              <span>
                Página {safeTransactionsPage} de {totalTransactionPages}
              </span>
            </div>

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
                  {paginatedTransactions.map((tx, i) => (
                    <tr key={tx._id ?? `${tx.date}-${tx.time}-${i}`} className="border-t border-gray-800/50 hover:bg-gray-800/20">
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
              {paginatedTransactions.map((tx, i) => (
                <TransactionMobileCard key={tx._id ?? `${tx.date}-${tx.name}-${i}`} tx={tx} />
              ))}
            </div>

            {totalTransactionPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-gray-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setTransactionsPage((page) => Math.max(1, page - 1))}
                  disabled={safeTransactionsPage === 1}
                  className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-medium text-gray-200 transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  {Array.from({ length: totalTransactionPages }, (_, index) => index + 1)
                    .filter((page) => page === 1 || page === totalTransactionPages || Math.abs(page - safeTransactionsPage) <= 1)
                    .map((page, index, pages) => (
                      <span key={page} className="flex items-center gap-2">
                        {index > 0 && page - pages[index - 1] > 1 && <span className="text-gray-600">…</span>}
                        <button
                          type="button"
                          onClick={() => setTransactionsPage(page)}
                          className={`min-w-8 rounded-lg px-3 py-2 font-medium transition-colors ${page === safeTransactionsPage ? "bg-emerald-600 text-white" : "border border-gray-700 text-gray-300 hover:bg-gray-800"}`}
                        >
                          {page}
                        </button>
                      </span>
                    ))}
                </div>
                <button
                  type="button"
                  onClick={() => setTransactionsPage((page) => Math.min(totalTransactionPages, page + 1))}
                  disabled={safeTransactionsPage === totalTransactionPages}
                  className="rounded-lg border border-gray-700 px-3 py-2 text-xs font-medium text-gray-200 transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
