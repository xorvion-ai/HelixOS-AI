/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // In local dev, proxy /api/* to the FastAPI dev server so the browser
  // talks to one origin. On Vercel, vercel.json routes /api to the Python
  // function and this rewrite is a no-op (the dev server isn't used).
  async rewrites() {
    const apiBase = process.env.API_PROXY_TARGET || "http://127.0.0.1:8000";
    if (process.env.VERCEL) return [];
    return [{ source: "/api/:path*", destination: `${apiBase}/api/:path*` }];
  },
};

export default nextConfig;
