import type { NextConfig } from "next";
import packageInfo from "./package.json";

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  env: {
    KUZELKATOR_VERSION: packageInfo.version,
    KUZELKATOR_COMMIT: process.env.RENDER_GIT_COMMIT?.trim().slice(0, 7) ?? "",
    KUZELKATOR_BUILT_AT: new Date().toISOString(),
  },
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
