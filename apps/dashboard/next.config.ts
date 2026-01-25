import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

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
  transpilePackages: [
    "@notra/db",
    "@notra/ui",
  ],
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

export default withWorkflow(nextConfig);
