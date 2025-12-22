/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Build sırasında ESLint hataları olsa bile build'e devam et
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TypeScript hataları olsa bile build'e devam et
    ignoreBuildErrors: true,
  },
};

export default nextConfig;