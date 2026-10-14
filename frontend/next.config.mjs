/** @type {import('next').NextConfig} */
let backendUrl = process.env.BACKEND_URL || "http://backend:8000";
if (!backendUrl.startsWith("http://") && !backendUrl.startsWith("https://")) {
  if (!backendUrl.includes(".")) {
    backendUrl = `https://${backendUrl}.onrender.com`;
  } else {
    backendUrl = `https://${backendUrl}`;
  }
}

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