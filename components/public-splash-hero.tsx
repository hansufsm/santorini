"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const SPLASH_STORAGE_KEY = "santorini-public-splash-seen-v1";

function ArrowIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

export function PublicSplashHero({
  appHref,
  appCtaLabel,
  helpHref,
}: {
  appHref: string;
  appCtaLabel: string;
  helpHref: string;
}) {
  const [immersive, setImmersive] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(true);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMotionAllowed(!prefersReducedMotion);

    const alreadySeen = window.localStorage.getItem(SPLASH_STORAGE_KEY) === "true";
    if (!alreadySeen) {
      setImmersive(true);
      window.localStorage.setItem(SPLASH_STORAGE_KEY, "true");
    }
  }, []);

  function shortenSplash() {
    setImmersive(false);
  }

  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border shadow-2xl transition-all duration-700 ease-out ${
        immersive ? "mb-8 min-h-[calc(100vh-6.5rem)]" : "mb-6 min-h-[28rem] md:min-h-[32rem]"
      }`}
      style={{ borderColor: "var(--border-main)" }}
      aria-label="Entrada pública AMRTS Santorini"
    >
      {motionAllowed ? (
        <video
          className="absolute inset-0 h-full w-full object-cover object-center"
          src="/intro-santorini.mp4"
          poster="/santorini.webp"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          src="/santorini.webp"
          alt="Vista aérea do Residencial Santorini"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-br from-[#011b15]/95 via-[#064e3b]/80 to-[#065f46]/45" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />

      <div className="relative z-10 flex min-h-[inherit] flex-col justify-between p-5 sm:p-8 md:p-10">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-black/25 px-3 py-2 text-white shadow-xl backdrop-blur-md">
            <img
              src="/logo-amtrs-48.png"
              alt="Logo AMRTS Santorini"
              className="h-10 w-10 rounded-xl object-cover ring-1 ring-emerald-200/40"
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-100/90">AMRTS</p>
              <p className="text-sm font-semibold leading-none text-white">Santorini</p>
            </div>
          </div>

          {immersive && (
            <button
              type="button"
              onClick={shortenSplash}
              className="rounded-full border border-white/20 bg-black/35 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              Ver site
            </button>
          )}
        </div>

        <div className="max-w-3xl py-10 text-white md:py-14">
          <span className="inline-flex rounded-full bg-emerald-500/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white shadow-lg shadow-emerald-950/30">
            Gestão residencial oficial
          </span>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
            Residencial Santorini em uma experiência mais simples, segura e guiada.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-50/80 sm:text-base">
            Acesse comunicados, contribuições, reservas, suporte e orientações de uso em um ambiente pensado primeiro para o celular, sem expor dados privados na entrada pública.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={appHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-950/30 transition hover:bg-emerald-500"
            >
              {appCtaLabel}
              <ArrowIcon />
            </Link>
            <Link
              href={helpHref}
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
            >
              Ajuda e Manuais
            </Link>
          </div>
        </div>

        <div className="grid gap-3 text-xs text-emerald-50/75 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3 backdrop-blur">
            <p className="font-semibold text-white">Mobile First</p>
            <p className="mt-1">Fluxos pensados para consulta rápida no celular.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3 backdrop-blur">
            <p className="font-semibold text-white">Dados protegidos</p>
            <p className="mt-1">Informações pessoais e financeiras ficam atrás do login.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3 backdrop-blur">
            <p className="font-semibold text-white">Manual por perfil</p>
            <p className="mt-1">Cada usuário recebe instruções compatíveis com sua role.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
