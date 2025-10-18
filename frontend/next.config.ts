import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML export for Nginx deployment
  output: 'export',
  
  // Trailing slash for better Nginx compatibility
  trailingSlash: true,
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
