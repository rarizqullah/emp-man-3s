/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    domains: ['iemwqfigkreipeptpman.supabase.co'],
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
    
    // Ignore warnings dari @vladmandic/face-api
    config.ignoreWarnings = [
      {
        module: /node_modules\/@vladmandic\/face-api/,
        message: /Critical dependency/,
      },
      (warning) => warning.message.includes('@vladmandic/face-api'),
    ];
    
    return config;
  },
};

module.exports = nextConfig; 