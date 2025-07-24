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
    
    return config;
  },
  // Ensure proper static generation
  output: 'standalone',
  // Disable static optimization for pages that use TensorFlow.js
  experimental: {
    esmExternals: 'loose',
  },
};

module.exports = nextConfig; 