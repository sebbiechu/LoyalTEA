import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // html5-qrcode uses browser APIs — exclude from server bundle
      config.externals = [...(config.externals ?? []), "html5-qrcode"];
    }
    return config;
  },
};

export default nextConfig;
