/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
      config.module.rules.push({
        test: /HeartbeatWorker\.js$/,
        use: 'null-loader',
      });
      return config;
    },
  };
  export default nextConfig;