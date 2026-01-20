import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add cache control headers
  async headers() {
    return [
      {
        // Apply to favicon and icons - short cache for updates
        source: '/:path*.(ico|svg|png)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate', // 1 hour instead of forever
          },
        ],
      },
    ];
  },
};

export default nextConfig;
