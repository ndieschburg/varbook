import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.js', // For Livewire auth pages
                'resources/js/app.tsx',
            ],
            refresh: true,
        }),
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icons/*.png', 'offline.html'],
            manifest: false, // Use our custom manifest.json
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
                // Include offline.html in precache
                additionalManifestEntries: [
                    { url: '/offline.html', revision: '1' },
                ],
                // Cache the SPA shell for offline navigation
                navigateFallback: '/offline.html',
                navigateFallbackDenylist: [
                    /^\/api\//,
                    /^\/opds\//,
                    /^\/webdav\//,
                    /^\/sanctum\//,
                    /^\/storage\//,
                ],
                runtimeCaching: [
                    {
                        // SPA navigation - cache the HTML shell for offline use
                        urlPattern: ({ request }) => request.mode === 'navigate',
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'spa-html-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                            },
                            networkTimeoutSeconds: 3,
                        },
                    },
                    {
                        // EPUB downloads - cache first, long TTL (immutable content)
                        urlPattern: /\/api\/books\/\d+\/download/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'epub-cache',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        // API responses - stale while revalidate for offline support
                        urlPattern: /\/api\//i,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'api-cache',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60, // 1 hour
                            },
                        },
                    },
                    {
                        urlPattern: /\/storage\/covers\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'cover-cache',
                            expiration: {
                                maxEntries: 200,
                                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                            },
                        },
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './resources/js'),
        },
    },
});
