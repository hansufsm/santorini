"use client";

import { FormEvent, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { convexMutation } from "@/lib/convex";

type FeedbackCategory = "sugestao" | "problema" | "elogio" | "duvida" | "outro";

type SubmitState = "idle" | "submitting" | "success" | "error";

const CATEGORY_OPTIONS: Array<{ value: FeedbackCategory; label: string; helper: string }> = [
  { value: "sugestao", label: "Sugestão", helper: "Ideias para melhorar o app ou a associação." },
  { value: "problema", label: "Problema", helper: "Algo que falhou, confundiu ou impediu o uso." },
  { value: "elogio", label: "Elogio", helper: "Algo que funcionou bem e deve ser preservado." },
  { value: "duvida", label: "Dúvida", helper: "Perguntas sobre uso, dados ou processos." },
  { value: "outro", label: "Outro", helper: "Qualquer outro comentário relevante." },
];

const MAX_MESSAGE_LENGTH = 2000;

export function CommunityFeedbackButton() {
  const pathname = usePathname();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("sugestao");
  const [message, setMessage] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedCategory = useMemo(
    () => CATEGORY_OPTIONS.find((option) => option.value === category),
    [category]
  );

  const remaining = MAX_MESSAGE_LENGTH - message.length;
  const canSubmit = message.trim().length >= 5 && remaining >= 0 && submitState !== "submitting";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitState("submitting");
    setErrorMessage("");

    try {
      await convexMutation("feedbacks:createFeedback", {
        sessionToken: session?.token,
        associationId: "amrts",
        category,
        message: message.trim(),
        url: window.location.href,
        route: pathname || window.location.pathname || "/",
      });

      setSubmitState("success");
      setMessage("");
      setCategory("sugestao");
      window.setTimeout(() => {
        setOpen(false);
        setSubmitState("idle");
      }, 1800);
    } catch (error) {
      setSubmitState("error");
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível enviar o feedback agora.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setSubmitState("idle");
          setErrorMessage("");
        }}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 shadow-xl shadow-emerald-950/30 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-emerald-950"
        aria-label="Enviar feedback comunitário"
      >
        <span aria-hidden="true">✦</span>
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-emerald-950/70 px-3 py-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-emerald-300/20 bg-slate-950 text-emerald-50 shadow-2xl">
            <div className="border-b border-emerald-300/10 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/70">
                    Feedback Comunitário
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white">Ajude a melhorar o Santorini</h2>
                  <p className="mt-2 text-sm leading-6 text-emerald-100/70">
                    Envie uma sugestão, problema, elogio ou dúvida. A página atual será registrada automaticamente para facilitar a triagem.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full px-2 py-1 text-emerald-100/60 transition hover:bg-emerald-900/60 hover:text-white"
                  aria-label="Fechar formulário de feedback"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
              <div>
                <label htmlFor="feedback-category" className="text-sm font-medium text-emerald-50">
                  Categoria
                </label>
                <select
                  id="feedback-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as FeedbackCategory)}
                  className="mt-2 w-full rounded-xl border border-emerald-300/20 bg-emerald-950/60 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-300"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {selectedCategory && (
                  <p className="mt-1 text-xs text-emerald-100/55">{selectedCategory.helper}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="feedback-message" className="text-sm font-medium text-emerald-50">
                    Mensagem
                  </label>
                  <span className={`text-xs ${remaining < 0 ? "text-red-300" : "text-emerald-100/45"}`}>
                    {remaining} caracteres restantes
                  </span>
                </div>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={MAX_MESSAGE_LENGTH + 200}
                  rows={6}
                  placeholder="Descreva de forma objetiva o que você percebeu ou gostaria de sugerir."
                  className="mt-2 w-full resize-none rounded-xl border border-emerald-300/20 bg-emerald-950/60 px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-emerald-100/35 focus:border-emerald-300"
                />
              </div>

              <div className="rounded-xl border border-emerald-300/10 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-100/60">
                <p>
                  Contexto registrado: <span className="font-medium text-emerald-100">{pathname || "/"}</span>
                  {session ? ` · ${session.role}` : " · visitante"}
                </p>
                <p className="mt-1">Nenhuma captura de tela é enviada neste MVP.</p>
              </div>

              {submitState === "success" && (
                <p className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                  Feedback enviado com sucesso. Obrigado por contribuir.
                </p>
              )}

              {submitState === "error" && (
                <p className="rounded-xl border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {errorMessage}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-emerald-300/20 px-4 py-2 text-sm font-medium text-emerald-100/80 transition hover:bg-emerald-900/50 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-900 disabled:text-emerald-100/35"
                >
                  {submitState === "submitting" ? "Enviando…" : "Enviar feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
