/**
 * app-footer.tsx — Rodapé de versionamento
 *
 * Exibe o nome do sistema, ano e, quando disponível (em produção no Vercel),
 * o hash do commit e o timestamp do build.
 *
 * Em desenvolvimento local a linha de versão não aparece,
 * pois NEXT_PUBLIC_GIT_COMMIT só é preenchida pelo Vercel.
 */

// Lê as variáveis injetadas no build pelo next.config.ts
const commit = process.env.NEXT_PUBLIC_GIT_COMMIT;      // ex: "7cbbfd9" (apenas em produção)
const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;   // ex: "2026-05-23T13:53:53 UTC"

export function AppFooter() {
  const year = new Date().getFullYear();

  // Só mostra a linha de versão se houver hash de commit (ou seja, build de produção)
  const hasVersion = Boolean(commit);

  return (
    <footer className="mt-8 pb-6 text-center">
      {/* Linha 1: nome + ano */}
      <p className="text-sm font-medium" style={{ color: "var(--text-emerald, #059669)" }}>
        AMRTS Santorini Dashboard &copy; {year} — Gestão Residencial
      </p>

      {/* Linha 2: hash do commit + timestamp — omitida em desenvolvimento */}
      {hasVersion && (
        <p className="text-xs font-mono mt-1" style={{ color: "var(--text-dim, #6b7280)" }}>
          v{commit}&nbsp;&nbsp;—&nbsp;&nbsp;{buildTime}
        </p>
      )}
    </footer>
  );
}
