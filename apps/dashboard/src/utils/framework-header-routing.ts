import { isDemoMode } from "@notra/utils/demo-mode";

import { IMAGE_SECURITY_HEADERS } from "../constants/framework-image";
import { getDashboardSecurityHeaders } from "./framework-request";

export function getDashboardHeaderRouting(
  vercel: boolean,
  demo = isDemoMode()
) {
  const headers = getDashboardSecurityHeaders(demo);
  const routeRules: Record<string, { headers: Record<string, string> }> = vercel
    ? {}
    : {
        "/**": { headers },
        "/api/image": { headers: IMAGE_SECURITY_HEADERS },
      };
  return {
    routeRules,
    vercelConfig: vercel
      ? {
          version: 3 as const,
          // CDN headers must not stop external rewrites; specific headers win last.
          routes: [
            { src: "/(.*)", headers, continue: true },
            {
              src: "/api/image",
              headers: IMAGE_SECURITY_HEADERS,
              continue: true,
            },
          ],
        }
      : undefined,
  };
}
