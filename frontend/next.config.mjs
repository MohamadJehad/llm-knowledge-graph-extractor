/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    proxyTimeout: 120000, // 2 minutes — Gemini thinking models can take 20-60s
  },
  async rewrites() {
    const backend = process.env.BACKEND_URL || 'http://localhost:3001';
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
    ];
  },
};
export default nextConfig;
