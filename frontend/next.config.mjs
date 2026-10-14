/** @type {import('next').NextConfig} */
const backendUrl = process.env.BACKEND_URL || "http://backend:8000";

const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

