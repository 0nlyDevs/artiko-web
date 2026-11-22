import type { NextConfig } from "next";

const api = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");

// Directives that cannot break the museum's inline and vendored scripts. A script-src policy
// needs per-request nonces for Next's inline hydration code and is a separate piece of work.
const contentSecurityPolicy = "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'";

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The scan and AR features need the camera on this origin only.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), xr-spatial-tracking=(self)" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Next 16 refuses to optimize images from a private address (SSRF guard). A local API
    // (http://localhost:8000) is one, so allow it only when the API itself is local.
    dangerouslyAllowLocalIP: ["localhost", "127.0.0.1", "[::1]"].includes(api.hostname),
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
        // CSS Modules (the KANTO frontend under src/kanto) keep Next's built-in handling:
        // retyping them as plain CSS through the Tailwind loader would drop their scoped classes.
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
