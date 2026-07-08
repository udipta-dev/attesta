/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fully client-side app: export a static site that any host (Cloudflare Pages)
  // can serve with no server runtime. Output goes to out/.
  output: "export",
  images: { unoptimized: true },
  webpack: (config) => {
    // pdf.js and c2pa are browser-only. Prevent bundlers from resolving the
    // optional node "canvas" dependency that pdf.js references but never needs
    // in the browser build.
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
};

module.exports = nextConfig;
