/** @type {import('next').NextConfig} */
module.exports = {
  output: 'export',
  trailingSlash: true,
  distDir: process.env.NODE_ENV === 'production' ? '../build/app' : '.next',
  turbopack: {},
  reactCompiler: true,
};
