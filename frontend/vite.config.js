import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "automatic",
      include: /\.([jt]sx?|mdx)$/,
    })
  ],
  server: {
    host: true,
    port: 3000
  },
  preview: {
    port: 3000
  },
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.[jt]sx?$/,
    jsx: "automatic"
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
        ".ts": "tsx"
      },
      jsx: "automatic"
    }
  }
});
