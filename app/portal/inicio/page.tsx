/**
 * portal/inicio/page.tsx — Página inicial do portal do associado
 * Mostra resumo financeiro pessoal e histórico recente.
 */
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useConvexQuery } from "@/lib/convex";
import { formatCurrency, formatDate, addDays, currentMonthKey } from "@/lib/utils";

const PAYMENT_LINK = "https://loja.infinitepay.io/amrts/mlr1645-mensalidade-amtrs";
const PIX_KEY = "pix@santorini.org.br";

// Tipo retornado por transactions:getAssociateHistory
type HistoryData = {
  name: string;
  total: number;
  monthsActive: number;
  lastDate: string;
  paidThisMonth?: boolean;
  unit?: string | null;
  transactions: Array<{
    date: string;
    time: string;
    value: number;
    detail: string;
    type: string;
    name: string;
  }>;
} | null;

// Card de estatística simples
function StatCard({ emoji, label, value, sub }: { emoji: string; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-emerald-400/10 bg-emerald-950/55 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
      <div className="mb-2 text-2xl">{emoji}</div>
      <p className="text-xs uppercase tracking-wide text-emerald-200/65">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-emerald-100/45">{sub}</p>}
    </div>
  );
}

function ContributionCTA({ monthLabel, firstName }: { monthLabel: string; firstName: string }) {
  const [copied, setCopied] = useState(false);

  async function copyPixKey() {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-amber-300/25 bg-gradient-to-br from-amber-300 via-emerald-400 to-emerald-700 p-[1px] shadow-[0_24px_70px_rgba(16,185,129,0.22)]">
      <div className="relative rounded-[1.7rem] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_36%),linear-gradient(135deg,rgba(6,78,59,0.98),rgba(2,44,34,0.98))] p-5 sm:p-6">
        <div className="absolute right-4 top-4 h-24 w-24 rounded-full bg-amber-300/20 blur-3xl" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/85">Contribuição mensal</p>
        <h3 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">
          {firstName}, vamos deixar {monthLabel} em dia?
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-50/82 sm:text-base">
          Ainda não localizamos sua contribuição deste mês no extrato da AMRTS. Se você já pagou, desconsidere este aviso; se ainda falta, o pagamento leva menos de 1 minuto e ajuda diretamente na segurança e no cuidado do Residencial Santorini.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
          <a
            href={PAYMENT_LINK}
            target="_blank"
            rel="noreferrer"
            className="group flex min-h-24 flex-col justify-between rounded-2xl bg-white px-4 py-4 text-emerald-950 shadow-xl shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:shadow-2xl"
          >
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Pagar agora</span>
            <span className="mt-2 text-lg font-black leading-tight">Abrir link seguro da mensalidade</span>
            <span className="mt-3 text-sm font-semibold text-emerald-700 transition group-hover:translate-x-1">Ir para o pagamento →</span>
          </a>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100/75">Pix direto</p>
            <p className="mt-2 break-all font-mono text-lg font-bold text-white">{PIX_KEY}</p>
            <button
              type="button"
              onClick={copyPixKey}
              className="mt-4 w-full rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-black text-emerald-950 transition hover:bg-emerald-200"
            >
              {copied ? "Chave Pix copiada" : "Copiar chave Pix"}
            </button>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-emerald-50/60">
          Dica: após pagar, a baixa aparece quando a diretoria importar/atualizar o extrato financeiro. Obrigado por contribuir com uma comunidade mais segura e organizada.
        </p>
      </div>
    </section>
  );
}

export default function InicioPage() {
  const { session } = useAuth();

  const canViewFinancialData = session?.role === "associado" && Boolean(session?.associateId);

  // Buscar histórico financeiro somente para associado contribuinte com vínculo confirmado.
  const { data, loading, error } = useConvexQuery<HistoryData>(
    "transactions:getAssociateHistory",
    { search: "", associateId: canViewFinancialData ? session?.associateId : undefined },
    !session || !canViewFinancialData // pular a query se não houver permissão/vínculo financeiro
  );

  if (!session) return null;

  if (!canViewFinancialData) {
    const firstName = session.name.split(" ")[0];
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">Olá, {firstName}!</h2>
          <p className="mt-1 text-sm text-emerald-100/65">
            Unidade <strong className="text-white">{session.unit}</strong> — bem-vindo ao seu portal.
          </p>
        </div>

        <section className="rounded-[1.75rem] border border-emerald-400/15 bg-emerald-950/60 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">Área segura</p>
          <h3 className="mt-3 text-2xl font-black leading-tight text-white">Seus dados estão protegidos</h3>
          <p className="mt-3 text-sm leading-relaxed text-emerald-50/70">
            Esta conta está como morador e não possui vínculo de associado contribuinte confirmado. Por privacidade, não exibimos valores, históricos ou dados financeiros de outros moradores.
          </p>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-bold text-white">Quer regularizar ou vincular seu cadastro?</p>
            <p className="mt-1 text-xs leading-relaxed text-emerald-100/65">
              Fale com a diretoria para confirmar seu CPF como associado contribuinte. Se deseja contribuir agora, use o link seguro ou o Pix direto abaixo.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a href={PAYMENT_LINK} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-300 px-4 py-3 text-center text-sm font-black text-emerald-950 transition hover:bg-emerald-200">
                Contribuir agora
              </a>
              <div className="rounded-xl border border-emerald-300/20 bg-emerald-900/40 px-4 py-3 text-center text-sm font-mono font-bold text-emerald-50">
                {PIX_KEY}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (loading) {
    return <div className="text-gray-400 text-center py-12">Carregando dados financeiros…</div>;
  }

  if (error) {
    return <div className="text-red-400 text-center py-12">Erro ao carregar dados: {error}</div>;
  }

  // Verificar se há pagamento no mês atual
  const thisMonth = currentMonthKey();
  const paidThisMonth = Boolean(data?.paidThisMonth ?? data?.transactions.some((t) => t.date.startsWith(thisMonth)));
  const monthLabel = new Date(`${thisMonth}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const firstName = session.name.split(" ")[0];

  // Estimar próxima contribuição (30 dias após a última)
  const nextEstimated = data?.lastDate ? addDays(data.lastDate, 30) : null;

  return (
    <div className="space-y-6">

      {/* Saudação */}
      <div>
        <h2 className="text-xl font-bold text-white">
          Olá, {firstName}!
        </h2>
        <p className="mt-1 text-sm text-emerald-100/65">
          Unidade <strong className="text-white">{session.unit}</strong> — bem-vindo ao seu portal.
        </p>
      </div>

      {/* Status do mês atual / CTA prioritário */}
      {!paidThisMonth ? (
        <ContributionCTA monthLabel={monthLabel} firstName={firstName} />
      ) : (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <p className="text-sm font-bold text-white">Mensalidade em dia</p>
          <p className="mt-1 text-xs text-emerald-100/65">
            Localizamos sua contribuição de {monthLabel}. Obrigado por manter o Santorini organizado e seguro.
          </p>
        </div>
      )}

      {/* Cards de resumo */}
      {data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard emoji="💰" label="Total Contribuído" value={formatCurrency(data.total)} />
          <StatCard emoji="📅" label="Meses Ativos" value={String(data.monthsActive)} />
          <StatCard emoji="📆" label="Última Contribuição" value={formatDate(data.lastDate)} />
          <StatCard
            emoji="⏰"
            label="Próxima Estimada"
            value={nextEstimated ? formatDate(nextEstimated) : "—"}
            sub="aprox. 30 dias após a última"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-400/10 bg-emerald-950/55 p-6 text-center text-emerald-100/65">
          <p>Nenhum histórico financeiro anterior foi encontrado para este cadastro.</p>
          <p className="mt-2 text-xs">Se você já contribuiu, fale com a diretoria para conferir o vínculo do seu CPF no cadastro.</p>
        </div>
      )}

      {/* Transações recentes */}
      {data && data.transactions.length > 0 && (
        <div className="rounded-2xl border border-emerald-400/10 bg-emerald-950/55 p-4">
          <h3 className="mb-3 text-sm font-semibold text-emerald-50">Últimas contribuições</h3>
          <div className="space-y-2">
            {data.transactions.slice(0, 5).map((tx, i) => (
              <div key={i} className="flex items-center justify-between border-b border-emerald-400/10 py-2 last:border-0">
                <span className="text-sm text-emerald-100/70">{formatDate(tx.date)}</span>
                <span className="text-sm font-semibold text-emerald-300">{formatCurrency(tx.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
