import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https?.*\/_next\/static\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "next-static-assets",
        expiration: {
          maxEntries: 128,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /^https?.*\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-media",
        expiration: {
          maxEntries: 128,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /^https?.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "pages-and-data",
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = withPWA({
  reactStrictMode: true,
});

export default nextConfig;
