/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3', '@xenova/transformers', 'onnxruntime-node', 'sharp'],
  devIndicators: false,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  webpack: (config, { dev }) => {
    // File-change events are unreliable in OneDrive-synced folders on Windows, so poll in development.
    if (dev) config.watchOptions = { ...config.watchOptions, poll: 1000, aggregateTimeout: 300 };
    return config;
  },
};
export default nextConfig;
