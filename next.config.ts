import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    // Keep the standalone static demos outside the portfolio's React layout.
    const concepts = [
      'warp', 'mercury', 'manual-labor', 'omega', 'shopify',
      'v2/warp', 'v2/mercury', 'v2/manual-labor', 'v2/omega',
      'v2/shopify', 'v2/praxis', 'v2/attio', 'v2/human-orbit', 'v2/threadline',
      'pria', 'pria/agent-interaction-concepts',
    ];
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
