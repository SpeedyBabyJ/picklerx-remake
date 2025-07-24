/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    
    // Prevent TensorFlow.js from being bundled during SSR
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@tensorflow/tfjs': 'commonjs @tensorflow/tfjs',
        '@tensorflow-models/pose-detection': 'commonjs @tensorflow-models/pose-detection',
        '@tensorflow/tfjs-backend-webgl': 'commonjs @tensorflow/tfjs-backend-webgl',
      });
    }
    
    // Prevent environment flag evaluation during build
    config.plugins = config.plugins || [];
    
    return config;
  },
  // Ensure proper static generation
  output: 'standalone',
  // Disable static optimization for pages that use TensorFlow.js
  experimental: {
    esmExternals: 'loose',
  },
  // Environment variables that are safe to expose
  env: {
    NEXT_PUBLIC_DEBUG: process.env.NEXT_PUBLIC_DEBUG || 'false',
  },
  // Disable automatic static optimization for assessment page
  async headers() {
    return [
      {
        source: '/assessment',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig; 