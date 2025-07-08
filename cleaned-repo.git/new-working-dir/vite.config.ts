import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ISKCON Bureau Management Portal',
        short_name: 'ISKCON Bureau',
        description: 'ISKCON Bureau Management Portal - Manage meetings, documents, voting, and attendance',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#dc2626',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/lovable-uploads/7ccf6269-31c1-46b9-bc5c-60b58a22c03e.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/lovable-uploads/7ccf6269-31c1-46b9-bc5c-60b58a22c03e.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
        categories: ['productivity', 'business'],
        shortcuts: [
          {
            name: 'Meetings',
            short_name: 'Meetings',
            description: 'View and manage meetings',
            url: '/?module=meetings',
            icons: [
              {
                src: '/lovable-uploads/7ccf6269-31c1-46b9-bc5c-60b58a22c03e.png',
                sizes: '96x96',
              },
            ],
          },
          {
            name: 'Documents',
            short_name: 'Documents',
            description: 'Access document repository',
            url: '/?module=documents',
            icons: [
              {
                src: '/lovable-uploads/7ccf6269-31c1-46b9-bc5c-60b58a22c03e.png',
                sizes: '96x96',
              },
            ],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.+\.(?:png|jpg|jpeg|svg|gif|ico|webp)$/, // cache images
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/.+\.(?:js|css)$/, // cache scripts/styles
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
