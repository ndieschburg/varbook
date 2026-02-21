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
            // Put SW at root for full scope
            srcDir: 'public',
            filename: 'sw.js',
            scope: '/',
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
                // Include offline.html in precache for fallback
                additionalManifestEntries: [
                    { url: '/offline.html', revision: '1' },
                ],
                // Disable default NavigationRoute (index.html doesn't exist in Laravel)
                navigateFallback: null,
                runtimeCaching: [
                    {
                        // SPA HTML pages - cache for offline use
                        // Matches SPA routes (not API, storage, etc.)
                        urlPattern: ({ request, url }) => {
                            if (request.mode !== 'navigate') return false;
                            const path = url.pathname;
                            if (path.startsWith('/api/')) return false;
                            if (path.startsWith('/opds/')) return false;
                            if (path.startsWith('/webdav/')) return false;
                            if (path.startsWith('/sanctum/')) return false;
                            if (path.startsWith('/storage/')) return false;
                            if (path.startsWith('/build/')) return false;
                            return true;
                        },
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'spa-html-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                            },
                            networkTimeoutSeconds: 3,
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                            plugins: [
                                {
                                    handlerDidError: async () => {
                                        return caches.match('/offline.html');
                                    },
                                },
                            ],
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
                            cacheableResponse: {
                                statuses: [0, 200],
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
                            cacheableResponse: {
                                statuses: [0, 200],
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
