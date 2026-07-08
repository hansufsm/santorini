"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Play, Volume2, VolumeX } from "lucide-react";

interface PublicSplashHeroProps {
  appHref: string;
  appCtaLabel: string;
}

const STORAGE_KEY = "santorini-splash-seen-v3";

export function PublicSplashHero({ appHref, appCtaLabel }: PublicSplashHeroProps) {
  const [showSplash, setShowSplash] = useState(false);
  const [fadeActive, setFadeActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const splashTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detectar mobile e preferências de movimento
    setIsMobile(window.innerWidth < 768);
    setPrefersReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    // Verificar se já viu o splash nesta sessão
    const alreadySeen = localStorage.getItem(STORAGE_KEY) === "true";
    if (!alreadySeen) {
      setShowSplash(true);
      setFadeActive(true);

      // Auto-encerrar o splash após 7 segundos
      splashTimerRef.current = window.setTimeout(() => {
        handleSkip();
      }, 7500);
    }

    return () => {
      if (splashTimerRef.current) window.clearTimeout(splashTimerRef.current);
    };
  }, []);

  function handleSkip() {
    if (splashTimerRef.current) {
      window.clearTimeout(splashTimerRef.current);
      splashTimerRef.current = null;
    }
    // Inicia transição de fade-out
    setFadeActive(false);
    localStorage.setItem(STORAGE_KEY, "true");
    setTimeout(() => {
      setShowSplash(false);
    }, 500); // tempo correspondente ao transition-opacity do CSS
  }

  // ─── Render Splash Completo (Primeira Visita) ──────────────────────────────────
  if (showSplash) {
    return (
      <div
        className={`fixed inset-0 z-[120] flex flex-col items-center justify-center bg-slate-950 transition-opacity duration-500 ${
          fadeActive ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Vídeo de background ou imagem estática de fallback */}
        {!isMobile && !prefersReducedMotion ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
            src="/intro-santorini.mp4"
          />
        ) : (
          <img
            src="/santorini.webp"
            alt="Vista Residencial Santorini"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* Overlay escuro em degradê para garantir excelente legibilidade */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/80" />

        {/* Brilhos decorativos */}
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />

        {/* Conteúdo Centralizado */}
        <div className="relative z-10 w-full max-w-2xl px-6 text-center space-y-6 flex flex-col items-center">
          <div className="animate-bounce duration-1000 mb-2">
            <img
              src="/logo-amtrs-96.png"
              alt="Logo AMRTS Santorini"
              className="h-20 w-20 rounded-2xl object-cover ring-2 ring-emerald-300/40 shadow-2xl"
            />
          </div>

          <span className="bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-semibold uppercase tracking-[0.24em] px-4 py-1.5 rounded-full">
            AMRTS Santorini
          </span>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none drop-shadow-lg">
            Gestão Residencial Avançada
          </h1>

          <p className="text-sm sm:text-base text-emerald-100/75 max-w-md leading-relaxed">
            Bem-vindo ao sistema oficial da associação de moradores do Residencial Santorini. Praticidade, segurança e total transparência.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto pt-4">
            <Link
              href={appHref}
              onClick={handleSkip}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-xl shadow-emerald-950/50 text-sm hover:scale-105"
            >
              {appCtaLabel === "Entrar" ? "Entrar no Portal" : appCtaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={handleSkip}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-white/20 bg-black/40 hover:bg-white/10 text-white font-semibold px-6 py-3.5 transition-all text-sm backdrop-blur"
            >
              Pular para a Home
            </button>
          </div>
        </div>

        {/* Rodapé sutil */}
        <p className="absolute bottom-6 z-10 text-[10px] tracking-wider text-emerald-200/35 uppercase">
          AMRTS Santorini © {new Date().getFullYear()}
        </p>
      </div>
    );
  }

  // ─── Render Hero Integrado na Página (Visitas seguintes) ──────────────────────────
  return (
    <div
      className="relative h-44 sm:h-56 md:h-80 rounded-3xl overflow-hidden mb-6 md:mb-8 shadow-2xl group border flex items-end p-6 sm:p-8 md:p-10"
      style={{ borderColor: "var(--border-main)" }}
    >
      {/* Vídeo sutil ou imagem de background */}
      {!isMobile && !prefersReducedMotion ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-[1.03]"
          src="/intro-santorini.mp4"
        />
      ) : (
        <img
          src="/santorini.webp"
          alt="Vista aérea do Residencial Santorini"
          className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-in-out group-hover:scale-105"
        />
      )}

      {/* Overlay gradiente esmeralda */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#022c22]/90 via-[#064e3b]/80 to-[#065f46]/60" />

      {/* Efeitos de luz de fundo */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-500/15 blur-3xl group-hover:bg-emerald-400/20 transition-all duration-700" />
      <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-emerald-400/10 blur-2xl" />

      {/* Conteúdo do Hero */}
      <div className="relative z-10">
        <span className="bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2 md:mb-3 inline-block shadow-md">
          Painel Financeiro
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-sm">
          Residencial Santorini
        </h2>
        <p className="text-emerald-100/70 mt-1 md:mt-2 max-w-xl text-sm leading-relaxed hidden sm:block">
          Gestão de contribuições, comunicados e controle operacional do condomínio.
        </p>
      </div>
    </div>
  );
}
