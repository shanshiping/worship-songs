import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
