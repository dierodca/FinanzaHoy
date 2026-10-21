/** @type {import('next').NextConfig} */
const nextConfig = {
  // En Vercel el build no debe fallar por advertencias de ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
