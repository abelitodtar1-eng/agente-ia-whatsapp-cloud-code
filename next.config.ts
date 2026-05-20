import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@whiskeysockets/baileys",
    "better-sqlite3",
    "pino",
    "googleapis",
    "google-auth-library",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
