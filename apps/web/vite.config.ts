import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "");
  const proxyTarget = environment.VITE_PROXY_TARGET || "http://127.0.0.1:3001";
  const proxy = Object.fromEntries(
    ["/api", "/health", "/ping"].map((path) => [
      path,
      { target: proxyTarget, changeOrigin: false },
    ]),
  );

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@rad-ar/ui-operator/browser": fileURLToPath(new URL("../../packages/plugins/ui-operator/src/browser", import.meta.url)),
        "@rad-ar/ui-operator/manifest": fileURLToPath(
          new URL(
            "../../packages/plugins/ui-operator/src/operator-ui.manifest.ts",
            import.meta.url,
          ),
        ),
      },
    },
    server: {
      host: "127.0.0.1",
      port: 3000,
      strictPort: true,
      proxy,
    },
    preview: {
      host: "127.0.0.1",
      port: 3000,
      strictPort: true,
      proxy,
    },
    build: {
      outDir: "../../dist/apps/web",
      emptyOutDir: true,
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: true,
      include: ["../../packages/plugins/ui-operator/src/browser/**/*.test.{ts,tsx}"],
      exclude: ["e2e/**", "node_modules/**", "dist/**"],
    },
  };
});
