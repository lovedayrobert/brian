import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: { remotePatterns: [{ protocol: "https", hostname: "upload.wikimedia.org" }] },
  // The app is four spaces (Home, Radar, Ideas, Calendar). Old addresses keep working.
  async redirects() {
    return [
      { source: "/live", destination: "/radar/breaking", permanent: false },
      { source: "/pulse", destination: "/radar", permanent: false },
      { source: "/trends", destination: "/radar/trends", permanent: false },
      { source: "/trends/:id", destination: "/radar/trends/:id", permanent: false },
      { source: "/competitors", destination: "/radar/rivals", permanent: false },
      { source: "/lab", destination: "/ideas/new", permanent: false },
      { source: "/swipe", destination: "/", permanent: false },
      { source: "/ideas/inspiration", destination: "/", permanent: false },
      { source: "/learning", destination: "/", permanent: false },
      { source: "/learning/:path*", destination: "/", permanent: false },
      { source: "/develop", destination: "/ideas", permanent: false },
      { source: "/mockups", destination: "/ideas", permanent: false },
      { source: "/campaigns", destination: "/calendar", permanent: false },
      { source: "/calendar/results", destination: "/results", permanent: false },
    ];
  },
};

export default nextConfig;
