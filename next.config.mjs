/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals ?? []), "html5-qrcode"];
    }
    return config;
  },
};

export default nextConfig;
