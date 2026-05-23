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
  originalValue: string;
  transactionKey: string;
};

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

  // Gerar chave única se não houver coluna específica
  const key = get("chave") || get("key") || get("id") || `${get("data")}_${get("hora")}_${rawValue}_${get("nome")}`;

  return {
    date: get("data"),
    time: get("hora"),
    type: get("tipo"),
    name: get("nome"),
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

  // Estado do import
  const [preview, setPreview] = useState<Transaction[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const res = await convexMutation<{ inserted: number; skipped: number }>(
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

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-xl font-bold text-white">Transações</h2>
        <p className="text-sm text-gray-400 mt-1">Importe o extrato CSV do InfinitePay para registrar as contribuições</p>
      </div>

      {/* Upload CSV */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-medium text-gray-300">📥 Importar CSV</h3>

        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-xl p-8 cursor-pointer hover:border-emerald-600 transition-colors">
          <span className="text-3xl mb-2">📄</span>
          <span className="text-sm text-gray-400">{fileName || "Clique para selecionar o arquivo CSV"}</span>
          <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </label>

        {/* Preview */}
        {preview.length > 0 && (
          <div>
            <p className="text-sm text-gray-300 mb-2">{preview.length} transação(ões) encontrada(s) no arquivo</p>
            <div className="overflow-x-auto max-h-48 rounded-lg border border-gray-700">
              <table className="w-full text-xs">
                <thead className="bg-gray-800 sticky top-0">
                  <tr>
                    {["Data", "Nome", "Detalhe", "Valor"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 20).map((tx, i) => (
                    <tr key={i} className="border-t border-gray-800">
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
            <p className="text-gray-300 mt-1">✅ {result.inserted} inseridos &nbsp;·&nbsp; ⏭️ {result.skipped} duplicados ignorados</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-300">{error}</div>
        )}
      </div>

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
          <div className="overflow-x-auto">
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
            {txList.length > 100 && (
              <p className="text-center text-gray-500 text-xs py-3">Exibindo 100 de {txList.length} registros</p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
