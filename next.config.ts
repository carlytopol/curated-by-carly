import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["node-ical"],
  images: {
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "veimbiukubaqiowiankf.supabase.co",
        port: "",
        pathname: "/storage/v1/object/sign/curated-private-media/**",
      },
    ],
  },
};

export default nextConfig;
