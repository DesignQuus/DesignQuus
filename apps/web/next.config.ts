import type { NextConfig } from 'next';
import { resolve } from 'node:path';

const monorepoRoot = resolve(process.cwd(), '../..');

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
