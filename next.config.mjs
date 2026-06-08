/** @type {import('next').NextConfig} */
const backendUrl = (process.env.BACKEND_API_URL || "http://localhost:3001").replace(/\/$/, "");

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
