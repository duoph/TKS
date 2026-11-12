import type { NextConfig } from "next";

// The demo is fully client-side (state lives in the browser), so the
// server-caching features from the default template are not enabled.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
