// lib/utils.ts — Funções utilitárias de formatação

// Formata número como moeda brasileira (R$ 1.234,56)
export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Converte "YYYY-MM-DD" → "DD/MM/YYYY"
export function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return dateStr;
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// Formata CPF: "12345678900" → "123.456.789-00"
export function formatCPF(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

// Retorna mês atual no formato "YYYY-MM"
export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Soma 30 dias a uma data "YYYY-MM-DD" e retorna nova data "YYYY-MM-DD"
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Converte timestamp (ms) em "DD/MM/YYYY"
export function formatTimestamp(ts: number): string {
  return formatDate(new Date(ts).toISOString().slice(0, 10));
}
