/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable server-side features for api-extractor-model
  experimental: {
    serverComponentsExternalPackages: ["@microsoft/api-extractor-model"],
  },
};

module.exports = nextConfig;
