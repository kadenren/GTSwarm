/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3', '@xenova/transformers', 'onnxruntime-node', 'sharp'],
  devIndicators: false,
};
export default nextConfig;
