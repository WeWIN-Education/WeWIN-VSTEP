import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "img.youtube.com" }],
  },
  async redirects() {
    return [
      { source: "/beginner", destination: "/exam/vstep", permanent: false },
      { source: "/hsk", destination: "/exam/vstep", permanent: false },
      { source: "/hsk/:path*", destination: "/exam/vstep", permanent: false },
      { source: "/exam/lop-:level", destination: "/exam/vstep", permanent: false },
      { source: "/exam/lop-:level/:slug*", destination: "/exam/vstep", permanent: false },
      { source: "/exam/vstep/vstep-sample-01", destination: "/exam/vstep/vstep-test-1", permanent: false },
      { source: "/hsk-practice", destination: "/practice", permanent: false },
      { source: "/hsk-practice/:path*", destination: "/practice", permanent: false },
      { source: "/pricing", destination: "/login", permanent: false },
      { source: "/register", destination: "/login", permanent: false },
      { source: "/download", destination: "/", permanent: false },
      { source: "/stories/:path*", destination: "/video", permanent: false },
      { source: "/affiliate", destination: "/profile/settings", permanent: false },
      { source: "/partners", destination: "/about", permanent: false },
      { source: "/friends", destination: "/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
