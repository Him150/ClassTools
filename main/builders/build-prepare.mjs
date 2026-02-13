import { build } from 'esbuild';
import { configDotenv } from 'dotenv';
import workboxBuild from 'workbox-build';
import path from 'path';
import fs from 'fs-extra';
const { NODE_ENV } = process.env;

configDotenv();

await build({
  entryPoints: ['main/builders/**/*.ts'],
  outdir: 'build/builders',
  bundle: false,
  platform: 'node',
  format: 'cjs',
  sourcemap: true,
  outbase: 'main/builders',
  tsconfig: 'tsconfig.json',
});

// https://developers.google.com/web/tools/workbox/reference-docs/latest/module-workbox-build#.generateSW
const buildSW = () => {
  return workboxBuild.generateSW({
    swDest: 'renderer/public/workbox-sw.js',
    clientsClaim: true,
    mode: NODE_ENV,
    skipWaiting: true,
    sourcemap: false,
    runtimeCaching: [
      // Next.js Chunks
      {
        urlPattern: /^\/_next\/static\/.+$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static',
          expiration: {
            maxEntries: 500,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
        },
      },
      // Static Files
      {
        urlPattern: /^\/static\/.*/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'public-static',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 14 * 24 * 60 * 60,
          },
        },
      },
      // Next.js Pages
      {
        urlPattern: ({ request }) => request.destination === 'document' || request.url.includes('/_next/data/'),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'next-pages',
          networkTimeoutSeconds: 3,
        },
      },
    ],
  });
};

buildSW();

// Add Build Time
const dirPath = path.resolve(process.cwd(), 'renderer/public/buildArtifacts');
if (!fs.pathExistsSync(dirPath)) {
  fs.mkdirsSync(dirPath);
}
fs.writeFileSync(path.resolve(dirPath, 'UIVersion'), Date.now().toString());

console.log('✓ Build Success');
