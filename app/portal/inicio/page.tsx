/**
 * portal/inicio/page.tsx — Página inicial do portal do associado
 * Mostra primeiro a verificação de pagamento e, depois, resumo financeiro pessoal.
 */
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useConvexQuery } from "@/lib/convex";
import { formatCurrency, formatDate, addDays, currentMonthKey } from "@/lib/utils";

const PIX_KEY = "pix@santorini.org.br";

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

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-emerald-400/10 bg-emerald-950/55 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
      <p className="text-xs uppercase tracking-wide text-emerald-200/65">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-emerald-100/45">{sub}</p>}
    </div>
  );
}

function PaymentAction({ monthLabel, firstName }: { monthLabel: string; firstName: string }) {
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
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/85">Verificação de pagamento</p>
        <h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">
          {firstName}, vamos deixar {monthLabel} em dia?
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-50/82 sm:text-base">
          Este é o primeiro ponto do seu dashboard. Ainda não localizamos sua contribuição deste mês no extrato da AMRTS.
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-amber-100/75 sm:text-base">
          Se você já pagou, o extrato pode levar até 24 horas para ser atualizado. Volte amanhã para confirmar a quitação.
        </p>

        <div className="mt-5 max-w-xl">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur shadow-xl shadow-emerald-950/20">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-shrink-0 bg-white p-3 rounded-xl shadow-inner">
                <img
                  src="/pix-qrcode.png"
                  alt="QR Code Pix"
                  className="w-32 h-32 object-contain"
                />
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-left w-full">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100/75">Pix direto</p>
                <p className="mt-3 break-all font-mono text-lg font-bold text-white">{PIX_KEY}</p>
                <button
                  type="button"
                  onClick={copyPixKey}
                  className="mt-5 w-full rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-black text-emerald-950 transition hover:bg-emerald-200 shadow-md"
                >
                  {copied ? "Chave Pix copiada" : "Copiar chave Pix"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PaymentOk({ monthLabel }: { monthLabel: string }) {
  return (
    <section className="rounded-[1.75rem] border border-emerald-400/20 bg-emerald-400/10 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">Verificação de pagamento</p>
      <h2 className="mt-3 text-2xl font-black leading-tight text-white">Mensalidade em dia</h2>
      <p className="mt-2 text-sm leading-relaxed text-emerald-100/70">
        Localizamos sua contribuição de {monthLabel}. Obrigado por manter o Santorini organizado e seguro.
      </p>
    </section>
  );
}

function PaymentProtectedNotice({
  firstName,
  unit,
  linkedToUnit,
  financialResponsibleName,
}: {
  firstName: string;
  unit?: string;
  linkedToUnit?: boolean;
  financialResponsibleName?: string;
}) {
  return (
    <section className="rounded-[1.75rem] border border-emerald-400/15 bg-emerald-950/60 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/80">Verificação de pagamento</p>
      <h2 className="mt-3 text-2xl font-black leading-tight text-white">
        {linkedToUnit ? `Olá, ${firstName}. Unidade vinculada` : `Olá, ${firstName}. Vínculo financeiro não confirmado`}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-emerald-50/70">
        Unidade <strong className="text-white">{unit || "—"}</strong>
        {linkedToUnit && financialResponsibleName ? (
          <> — titular financeiro: <strong className="text-white">{financialResponsibleName}</strong>.</>
        ) : (
          <></>
        )} {linkedToUnit
          ? "Seu cadastro está vinculado à unidade, mas os valores, extratos e histórico de pagamento permanecem restritos ao associado titular por privacidade."
          : "Esta conta não possui vínculo ativo de associado contribuinte. Por privacidade, não exibimos valores, históricos ou dados financeiros de terceiros."}
      </p>
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-bold text-white">
          {linkedToUnit ? "Precisa atualizar dados da unidade?" : "Quer regularizar ou vincular seu cadastro?"}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-100/65">
          {linkedToUnit
            ? "Fale com a diretoria ou com o associado titular para atualizar contatos, vínculo familiar ou responsabilidade financeira."
            : "Fale com a diretoria para confirmar seu CPF como associado contribuinte. Se deseja contribuir agora, use o Pix direto abaixo."}
        </p>
        {!linkedToUnit && (
          <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-950/40 p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-shrink-0 bg-white p-2 rounded-lg">
                <img
                  src="/pix-qrcode.png"
                  alt="QR Code Pix"
                  className="w-24 h-24 object-contain"
                />
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300/80">Pix direto</p>
                <p className="mt-2 break-all font-mono text-sm font-bold text-white">{PIX_KEY}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function InicioPage() {
  const { session } = useAuth();
  const canViewFinancialData = session?.role === "associado" && Boolean(session?.associateId);
  const isLinkedResident = Boolean(session?.parentAssociateId) && !session?.associateId;

  const { data, loading, error } = useConvexQuery<HistoryData>(
    "transactions:getAssociateHistory",
    { search: "", associateId: canViewFinancialData ? session?.associateId : undefined, sessionToken: session?.token ?? "" },
    !session || !canViewFinancialData
  );

  if (!session) return null;

  const firstName = session.name.split(" ")[0];
  const thisMonth = currentMonthKey();
  const monthLabel = new Date(`${thisMonth}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  if (!canViewFinancialData) {
    return (
      <div className="space-y-6">
        <PaymentProtectedNotice
          firstName={firstName}
          unit={session.unit}
          linkedToUnit={isLinkedResident}
          financialResponsibleName={session.financialResponsibleName}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border border-emerald-400/15 bg-emerald-950/60 p-6 text-center text-emerald-100/65">
          Carregando verificação de pagamento…
        </section>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-400 text-center py-12">Erro ao carregar dados: {error}</div>;
  }

  const paidThisMonth = Boolean(data?.paidThisMonth ?? data?.transactions.some((t) => t.date.startsWith(thisMonth)));
  const nextEstimated = data?.lastDate ? addDays(data.lastDate, 30) : null;

  return (
    <div className="space-y-6">
      {paidThisMonth ? (
        <PaymentOk monthLabel={monthLabel} />
      ) : (
        <PaymentAction monthLabel={monthLabel} firstName={firstName} />
      )}

      <div>
        <h2 className="text-xl font-bold text-white">Olá, {firstName}!</h2>
        <p className="mt-1 text-sm text-emerald-100/65">
          Unidade <strong className="text-white">{session.unit}</strong> — resumo do seu portal.
        </p>
      </div>

      {data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total contribuído" value={formatCurrency(data.total)} />
          <StatCard label="Meses ativos" value={String(data.monthsActive)} />
          <StatCard label="Última contribuição" value={formatDate(data.lastDate)} />
          <StatCard
            label="Próxima estimada"
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
