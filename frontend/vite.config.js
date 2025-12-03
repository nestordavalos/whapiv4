import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(env.VITE_PORT || env.PORT || 3000);

  return {
    plugins: [
      react({
        jsxRuntime: "automatic",
        include: /\.([jt]sx?|mdx)$/,
      })
    ],
    server: {
      host: true,
      port
    },
    preview: {
      port
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
  };
});
