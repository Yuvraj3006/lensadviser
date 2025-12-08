import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Disable experimental performance monitoring that causes negative timestamp errors
  experimental: {
    instrumentationHook: false,
  },
  // Suppress performance API warnings in development
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
