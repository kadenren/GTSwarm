/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3', '@xenova/transformers', 'onnxruntime-node', 'sharp'],
  devIndicators: false,
  distDir: process.env.NEXT_DIST_DIR || '.next',
};
export default nextConfig;
