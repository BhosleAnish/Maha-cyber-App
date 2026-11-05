import type { NextConfig } from "next";

// BACKEND_URL is "host:port" on Render (from the blueprint) or a full URL locally.
const raw = (process.env.BACKEND_URL || "http://localhost:8000").trim();
const backend = /^https?:\/\//.test(raw) ? raw : `http://${raw}`;

const nextConfig: NextConfig = {
  // Browser calls /backend/* and Next forwards to the API, so no CORS or public API URL is needed.
  async rewrites() {
    return [{ source: "/backend/:path*", destination: `${backend}/:path*` }];
  },
  // AI correlation can take longer than the default 30s proxy timeout
  experimental: { proxyTimeout: 60_000 },
};

export default nextConfig;
