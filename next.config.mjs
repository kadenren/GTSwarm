/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3', '@xenova/transformers', 'onnxruntime-node', 'sharp'],
  devIndicators: false,
  // the local MiniLM model and image tooling are dev-only; excluding them keeps functions small on Vercel
  outputFileTracingExcludes: { '*': ['node_modules/@xenova/**', 'node_modules/onnxruntime-node/**', 'node_modules/onnxruntime-web/**', 'node_modules/onnxruntime-common/**', 'node_modules/sharp/**', 'node_modules/@img/**', 'data/**', 'demo-files/**'] },
  distDir: process.env.NEXT_DIST_DIR || '.next',
  webpack: (config, { dev }) => {
    // File-change events are unreliable in OneDrive-synced folders on Windows, so poll in development.
    if (dev) config.watchOptions = { ...config.watchOptions, poll: 1000, aggregateTimeout: 300 };
    return config;
  },
};
export default nextConfig;
