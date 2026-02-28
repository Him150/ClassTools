import { configDotenv } from 'dotenv';
import workboxBuild from 'workbox-build';

configDotenv();

// https://developer.chrome.com/docs/workbox/modules/workbox-build#method-generateSW
const buildSW = () => {
  return workboxBuild.generateSW({
    swDest: 'renderer/public/workbox-sw.js',
    clientsClaim: true,
    skipWaiting: true,
    sourcemap: false,
    runtimeCaching: [
      // Next.js Chunks and Static Files
      {
        urlPattern: ({ url }) => url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/static/'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'class-tools-static',
          expiration: {
            maxEntries: 500,
            maxAgeSeconds: 14 * 24 * 60 * 60,
          },
        },
      },
      // Web Pages
      {
        urlPattern: ({ request }) => request.destination === 'document',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'class-tools-pages',
          networkTimeoutSeconds: 5,
          expiration: {
            maxEntries: 500,
            maxAgeSeconds: 14 * 24 * 60 * 60,
          },
        },
      },
    ],
  });
};

buildSW();
