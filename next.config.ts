import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://*.wix.com https://*.wixsite.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
