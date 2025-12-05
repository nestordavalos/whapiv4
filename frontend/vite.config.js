import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(env.VITE_PORT || env.PORT || 3000);

  return {
    plugins: [
      react({
        jsxRuntime: "automatic",
        include: /\.([jt]sx?|mdx)$/,
      }),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "apple-touch-icon.png", "android-chrome-192x192.png"],
        manifest: {
          name: "T-Chateo",
          short_name: "T-chateo",
          description: "Sistema de Conversaciones y Mensajería",
          theme_color: "#000000",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/",
          icons: [
            {
              src: "/favicon-16x16.png",
              sizes: "16x16",
              type: "image/png"
            },
            {
              src: "/favicon-32x32.png",
              sizes: "32x32",
              type: "image/png"
            },
            {
              src: "/android-chrome-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable"
            },
            {
              src: "/apple-touch-icon.png",
              sizes: "180x180",
              type: "image/png"
            }
          ]
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2}"],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "gstatic-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
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
