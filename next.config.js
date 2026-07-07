/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // pdf.js and c2pa are browser-only. Prevent bundlers from resolving the
    // optional node "canvas" dependency that pdf.js references but never needs
    // in the browser build.
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
};

module.exports = nextConfig;
