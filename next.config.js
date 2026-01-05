/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable server-side features for api-extractor-model and its transitive dependencies
  experimental: {
    serverComponentsExternalPackages: [
      "@microsoft/api-extractor-model",
      "@microsoft/tsdoc",
      "@microsoft/tsdoc-config",
    ],
    // Explicitly include tsdoc schema files that are resolved at runtime
    outputFileTracingIncludes: {
      "/api/parse": ["./node_modules/@microsoft/tsdoc/**/*"],
    },
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
