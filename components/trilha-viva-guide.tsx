"use client";

import { useEffect, useMemo, useState } from "react";
import { convexMutation, convexQuery } from "@/lib/convex";
import { useAuth } from "@/lib/auth";
import { getTrilhaVivaGuide, type TrilhaVivaGuide, type UserRole } from "@/lib/trilha-viva-content";

type TrilhaVivaGuideProps = {
  pathname: string;
  role: UserRole | string;
};

type RemoteProgress = {
  status: "nao_iniciado" | "em_andamento" | "concluido" | "reiniciado";
  completionCount?: number;
  completedAt?: number;
  updatedAt?: number;
} | null;

function getStorageKey(guide: TrilhaVivaGuide, role: string) {
  return `santorini:trilha-viva:${role}:${guide.route}:completed`;
}

function readLocalCompletion(guide: TrilhaVivaGuide, role: string) {
  try {
    return window.localStorage.getItem(getStorageKey(guide, role)) === "true";
  } catch {
    return false;
  }
}

function writeLocalCompletion(guide: TrilhaVivaGuide, role: string, completed: boolean) {
  try {
    if (completed) {
      window.localStorage.setItem(getStorageKey(guide, role), "true");
    } else {
      window.localStorage.removeItem(getStorageKey(guide, role));
    }
  } catch {
    // LocalStorage pode estar indisponível em alguns navegadores; a UI continua funcional.
  }
}

export function TrilhaVivaGuideCard({ pathname, role }: TrilhaVivaGuideProps) {
  const { session } = useAuth();
  const guide = useMemo(() => getTrilhaVivaGuide(pathname, role), [pathname, role]);
  const [expanded, setExpanded] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [syncState, setSyncState] = useState<"local" | "sincronizando" | "sincronizado" | "indisponivel">("local");
  const [completionCount, setCompletionCount] = useState(0);

  useEffect(() => {
    if (!guide) return;

    const localCompleted = readLocalCompletion(guide, role);
    setCompleted(localCompleted);
    setExpanded(!localCompleted);
    setCompletionCount(0);

    if (!session?.token) {
      setSyncState("local");
      return;
    }

    let cancelled = false;
    setSyncState("sincronizando");

    async function syncGuide() {
      if (!guide || !session?.token) return;

      try {
        await convexMutation("trilhaViva:touchGuide", {
          sessionToken: session.token,
          route: guide.route,
          menuLabel: guide.menuLabel,
        });

        const remote = await convexQuery<RemoteProgress>("trilhaViva:getMyProgress", {
          sessionToken: session.token,
          route: guide.route,
        });

        if (cancelled) return;

        const remoteCompleted = remote?.status === "concluido";
        const isCompleted = remoteCompleted || localCompleted;
        setCompleted(isCompleted);
        setExpanded(!isCompleted);
        setCompletionCount(remote?.completionCount ?? (isCompleted ? 1 : 0));
        setSyncState("sincronizado");

        if (remoteCompleted) {
          writeLocalCompletion(guide, role, true);
        }
      } catch {
        if (cancelled) return;
        setSyncState("indisponivel");
      }
    }

    void syncGuide();

    return () => {
      cancelled = true;
    };
  }, [guide, role, session?.token]);

  if (!guide) return null;

  async function markAsCompleted() {
    if (!guide) return;

    writeLocalCompletion(guide, role, true);
    setCompleted(true);
    setExpanded(false);
    setCompletionCount((current) => Math.max(current, 1));

    if (!session?.token) {
      setSyncState("local");
      return;
    }

    setSyncState("sincronizando");
    try {
      await convexMutation("trilhaViva:completeGuide", {
        sessionToken: session.token,
        route: guide.route,
        menuLabel: guide.menuLabel,
      });
      setSyncState("sincronizado");
      setCompletionCount((current) => current + 1);
    } catch {
      setSyncState("indisponivel");
    }
  }

  async function restartGuide() {
    if (!guide) return;

    writeLocalCompletion(guide, role, false);
    setCompleted(false);
    setExpanded(true);

    if (!session?.token) {
      setSyncState("local");
      return;
    }

    setSyncState("sincronizando");
    try {
      await convexMutation("trilhaViva:restartGuide", {
        sessionToken: session.token,
        route: guide.route,
      });
      setSyncState("sincronizado");
    } catch {
      setSyncState("indisponivel");
    }
  }

  const syncLabel = {
    local: "progresso local",
    sincronizando: "sincronizando",
    sincronizado: "progresso salvo",
    indisponivel: "salvo localmente",
  }[syncState];

  return (
    <section
      aria-label={`Trilha Viva Santorini para ${guide.menuLabel}`}
      className="mb-5 overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-950/75 via-slate-950/90 to-emerald-950/45 shadow-2xl shadow-emerald-950/20"
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-300/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">
              Trilha Viva
            </span>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-emerald-100/80">
              {guide.badge} · {guide.menuLabel}
            </span>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-emerald-100/70">
              {syncLabel}
            </span>
            {completed && (
              <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-xs font-medium text-cyan-100">
                Etapa compreendida{completionCount > 1 ? ` · ${completionCount} revisões` : ""}
              </span>
            )}
          </div>
          <h2 className="mt-3 text-lg font-black text-white sm:text-xl">{guide.title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-emerald-50/75">
            Um guia rápido para entender para que serve esta área, o que você pode fazer e como agir com segurança.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200/40 hover:bg-emerald-400/15"
          aria-expanded={expanded}
        >
          {expanded ? "Recolher guia" : completed ? "Rever guia" : "Abrir guia"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-emerald-400/10 px-4 pb-4">
          <div className="grid gap-3 pt-4 lg:grid-cols-3">
            <article className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <h3 className="text-sm font-bold text-emerald-100">Para que serve</h3>
              <p className="mt-2 text-sm leading-6 text-slate-200/80">{guide.purpose}</p>
            </article>
            <article className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <h3 className="text-sm font-bold text-emerald-100">O que você pode ou deve fazer</h3>
              <p className="mt-2 text-sm leading-6 text-slate-200/80">{guide.canDo}</p>
            </article>
            <article className="rounded-xl border border-cyan-300/15 bg-cyan-400/[0.06] p-4">
              <h3 className="text-sm font-bold text-cyan-100">Técnica Santorini</h3>
              <p className="mt-2 text-sm leading-6 text-slate-200/80">{guide.proTip}</p>
            </article>
          </div>

          <div className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-950/35 p-4">
            <h3 className="text-sm font-bold text-emerald-100">Como fazer agora</h3>
            <ol className="mt-3 grid gap-2 text-sm text-slate-200/85 sm:grid-cols-3">
              {guide.howTo.map((step, index) => (
                <li key={step} className="flex gap-2 rounded-lg bg-black/15 p-3 leading-6">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-400/15 text-xs font-black text-emerald-100">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-emerald-50/60">
              Esta orientação muda conforme sua role e a área acessada. Quando possível, seu progresso é salvo na nuvem; se o serviço estiver indisponível, a experiência continua salva localmente.
            </p>
            <div className="flex flex-wrap gap-2">
              {completed && (
                <button
                  type="button"
                  onClick={restartGuide}
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-emerald-100/80 transition hover:bg-white/5"
                >
                  Reiniciar etapa
                </button>
              )}
              <button
                type="button"
                onClick={markAsCompleted}
                className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-black text-emerald-950 transition hover:bg-emerald-400"
              >
                {completed ? "Manter como compreendida" : guide.nextActionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
