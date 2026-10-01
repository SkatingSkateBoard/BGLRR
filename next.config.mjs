import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Keeps service worker out of local dev mode to stop caching headaches
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true, // Forces smooth transition bundles to download instantly
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your normal Next.js configuration rules go here (e.g., images, rewrites)
};

export default withPWA(nextConfig);
