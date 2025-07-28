const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'iemwqfigkreipeptpman.supabase.co',
        port: '',
        pathname: '**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  webpack: (config, { isServer, webpack }) => {
    // Mengatasi warning critical dependency dari @vladmandic/face-api
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
      };

      // Mengabaikan warning critical dependency dari face-api
      config.plugins.push(
        new webpack.ContextReplacementPlugin(
          /\/@vladmandic\/face-api/,
          (data) => {
            delete data.dependencies[0].critical;
            return data;
          }
        )
      );

      // Ignore dynamic require warnings for face-api
      config.module.unknownContextCritical = false;
      config.module.unknownContextRegExp = /\/@vladmandic\/face-api/;
    }

    // Fix untuk cookie dependency resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      'cookie': require.resolve('cookie'),
    };

    // Optimasi module resolution untuk Supabase SSR
    config.resolve.modules = [
      'node_modules',
      ...config.resolve.modules || []
    ];
    
    // Ignore warnings dari @vladmandic/face-api
    config.ignoreWarnings = [
      {
        module: /node_modules\/@vladmandic\/face-api/,
        message: /Critical dependency/,
      },
      {
        module: /node_modules\/cookie/,
        message: /Module not found/,
      },
      (warning) => warning.message.includes('@vladmandic/face-api'),
      (warning) => warning.message.includes('cookie'),
    ];
    
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig); 