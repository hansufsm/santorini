import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Os tipos do Convex (_generated/) são criados pelo 'npx convex dev' e não estão no repo.
    // Ignorar erros de tipo no build — os tipos ficam disponíveis após rodar 'npx convex dev' localmente.
    ignoreBuildErrors: true,
  },

  // Injeta informações de build como variáveis de ambiente públicas.
  // VERCEL_GIT_COMMIT_SHA é preenchido automaticamente pelo Vercel em cada deploy.
  // Em desenvolvimento local essas variáveis ficam undefined → rodapé omite a linha de versão.
  env: {
    NEXT_PUBLIC_GIT_COMMIT: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString().slice(0, 19) + " UTC",
  },
};

export default nextConfig;
