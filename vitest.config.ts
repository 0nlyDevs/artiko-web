import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import type { Plugin } from "vitest/config";

// Next imports an image as { src, width, height }. Vite alone would hand back a URL string,
// so the KANTO components (which read `.src`) get the same shape under test.
const nextImageImports: Plugin = {
  name: "next-image-imports",
  enforce: "pre",
  load(id) {
    const file = id.split("?")[0];
    if (/\.(webp|png|jpe?g|gif|avif|svg)$/.test(file)) {
      return `export default { src: ${JSON.stringify(file)}, width: 1, height: 1 };`;
    }
    return null;
  },
};

export default defineConfig({
  plugins: [nextImageImports],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "app",
          environment: "node",
          include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
          exclude: ["src/kanto/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "kanto",
          environment: "jsdom",
          include: ["src/kanto/**/*.test.{ts,tsx}"],
          setupFiles: ["./src/kanto/test/setup.ts"],
        },
      },
    ],
  },
});
