import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Os tipos do Convex (_generated/) são criados pelo 'npx convex dev' e não estão no repo.
    // Ignorar erros de tipo no build — os tipos ficam disponíveis após rodar 'npx convex dev' localmente.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
