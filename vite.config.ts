import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.svg',
          'icons/icon-180.png',
          'icons/icon-192.png',
          'icons/icon-192.svg',
          'icons/icon-512.png',
          'icons/icon-512.svg',
          'icons/icon-maskable-512.png',
          'icons/icon-maskable-512.svg',
          'icons/apple-splash-1170x2532.png',
          'offline.html',
        ],
        manifest: {
          name: 'HanoBus - Kigali Bus Tracker',
          short_name: 'HanoBus',
          description: 'Smart public transport companion for Kigali. Track buses in real time, plan trips, and get ETAs.',
          theme_color: '#2563eb',
          background_color: '#2563eb',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          categories: ['transportation', 'navigation', 'travel'],
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icons/icon-192.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
          shortcuts: [
            {
              name: 'View Routes',
              short_name: 'Routes',
              url: '/routes',
              icons: [{ src: '/icons/icon-192.svg', sizes: '192x192' }],
            },
            {
              name: 'Service Alerts',
              short_name: 'Alerts',
              url: '/alerts',
              icons: [{ src: '/icons/icon-192.svg', sizes: '192x192' }],
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/],
          runtimeCaching: [
            // OpenStreetMap tiles - cache first (offline map support)
            {
              urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'osm-tiles',
                expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // Google Maps API - network first with cache fallback
            {
              urlPattern: /^https:\/\/maps\.googleapis\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'google-maps',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [0, 200] },
                networkTimeoutSeconds: 5,
              },
            },
            // OSRM routing - network first
            {
              urlPattern: /^https:\/\/router\.project-osrm\.org\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'osrm-routes',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [0, 200] },
                networkTimeoutSeconds: 5,
              },
            },
            // Firebase Auth - network first
            {
              urlPattern: /^https:\/\/.*\.firebaseio\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'firebase-data',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
                cacheableResponse: { statuses: [0, 200] },
                networkTimeoutSeconds: 5,
              },
            },
            // Firebase Auth APIs
            {
              urlPattern: /^https:\/\/.*googleapis\.com\/identitytoolkit\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'firebase-auth',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // Google Fonts (if any)
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // Leaflet CDN resources
            {
              urlPattern: /^https:\/\/unpkg\.com\/leaflet.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'leaflet-assets',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GOOGLE_MAPS_API_KEY': JSON.stringify(env.GOOGLE_MAPS_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            react: ['react', 'react-dom', 'react-router-dom'],
            motion: ['motion/react'],
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
