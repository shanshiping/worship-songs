import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/songs/upload',
        destination: '/song-upload',
        permanent: false,
      },
    ]
  },
  // 允许外部图片域名
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // 实验性功能
  experimental: {
    // 允许大文件上传
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
