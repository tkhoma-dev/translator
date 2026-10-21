import type { NextConfig } from "next";

// Standalone output is for the Docker image (see Dockerfile). Next.js 16 builds
// with Turbopack by default and does not emit `.next/next-server.js.nft.json`,
// so `output: "standalone"` fails on Vercel with ENOENT. Vercel traces files itself.
const nextConfig: NextConfig = {
  output: process.env.NEXT_STANDALONE === "1" ? "standalone" : undefined,
};

export default nextConfig;
