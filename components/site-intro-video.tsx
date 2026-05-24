"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const INTRO_STORAGE_KEY = "santorini-intro-video-seen-v2";
const INTRO_MIN_VISIBLE_MS = 8000;

export function SiteIntroVideo() {
  const [visible, setVisible] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current === null) return;

    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const closeIntro = useCallback(() => {
    clearCloseTimer();
    setVisible(false);
  }, [clearCloseTimer]);

  const scheduleClose = useCallback(() => {
    if (closeTimerRef.current !== null) return;

    closeTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      closeTimerRef.current = null;
    }, INTRO_MIN_VISIBLE_MS);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const alreadySeen = window.localStorage.getItem(INTRO_STORAGE_KEY) === "true";
    if (alreadySeen) return;

    window.localStorage.setItem(INTRO_STORAGE_KEY, "true");
    setVisible(true);

    return () => clearCloseTimer();
  }, [clearCloseTimer]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/95 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Vídeo de introdução AMRTS Santorini"
    >
      <div className="relative w-full max-w-4xl overflow-hidden rounded-[2rem] border border-emerald-300/30 bg-black shadow-2xl shadow-emerald-950/40">
        <button
          type="button"
          onClick={closeIntro}
          className="absolute right-4 top-4 z-10 rounded-full border border-white/25 bg-black/55 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-lg backdrop-blur transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          aria-label="Fechar vídeo de introdução"
        >
          Pular intro
        </button>

        <video
          className="aspect-video h-auto w-full bg-black object-cover"
          src="/intro-santorini.mp4"
          autoPlay
          muted
          playsInline
          preload="auto"
          onCanPlay={scheduleClose}
          onPlaying={scheduleClose}
          onEnded={scheduleClose}
          onError={closeIntro}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/90">
            AMRTS Santorini
          </p>
          <p className="mt-2 text-lg font-semibold md:text-2xl">
            Bem-vindo ao sistema de gestão residencial.
          </p>
        </div>
      </div>
    </div>
  );
}
