import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true, // enabled by default but I like to be explicit
  reactCompiler: true,
  outputFileTracingIncludes: {
    "/*": ["./src/lib/ai/skills/**/*"],
  },
  experimental: {
    useCache: true,
    optimizePackageImports: ["@hugeicons/core-free-icons", "lucide-react"],
  },
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  transpilePackages: ["@notra/db", "@notra/ui"],
  async redirects() {
    return [
      {
        source: "/",
        destination: "/login",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
