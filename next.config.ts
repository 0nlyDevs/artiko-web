import type { NextConfig } from "next";

const api = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [
      // Works and proof files served by the API, and known works from Wikimedia Commons and the Met.
      { protocol: api.protocol === "https:" ? "https" : "http", hostname: api.hostname, port: api.port, pathname: "/media/**" },
      { protocol: "https", hostname: "commons.wikimedia.org" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "images.metmuseum.org" },
    ],
  },
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
