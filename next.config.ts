import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "evidence.kuzelky.cz",
        port: "",
        pathname: "/assets/clubs/**",
        search: "",
      },
    ],
    minimumCacheTTL: 86400,
    maximumRedirects: 0,
  },
};
export default config;
