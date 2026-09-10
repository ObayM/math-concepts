/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: {
    '/opengraph-image': ['./src/app/og-assets/**'],
  },
};

export default nextConfig;
