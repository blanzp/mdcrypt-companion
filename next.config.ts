import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Turbopack compat - PWA plugin uses webpack, tell Next.js it's OK
  turbopack: {},
};

export default withPWA(nextConfig);
