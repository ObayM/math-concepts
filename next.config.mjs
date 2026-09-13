/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['nodemailer'],
  outputFileTracingIncludes: {
    '/opengraph-image': ['./src/app/og-assets/**'],
  },
};

export default nextConfig;
