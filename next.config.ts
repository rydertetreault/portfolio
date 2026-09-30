import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    // Keep the standalone static demos outside the portfolio's React layout.
    const concepts = ['company', 'pria', 'pria/agent-interaction-concepts'];
    return [
      { source: '/demos', destination: '/demos/index.html' },
      ...concepts.map((route) => ({
        source: `/demos/${route}`,
        destination: `/demos/${route}/index.html`,
      })),
      { source: '/demos/pria/concept', destination: '/demos/pria/index.html' },
    ];
  },
};

export default nextConfig;
