import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  reactStrictMode: true, // enabled by default but I like to be explicit
  reactCompiler: true,
  experimental: {
    useCache: true,
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/login",
        permanent: true,
      },
    ];
  },
};

export default withWorkflow(nextConfig);
