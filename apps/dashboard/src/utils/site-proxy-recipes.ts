import { listMountedAreas } from "@notra/sites-core/utils/mounts";

import type { SiteMounts, SiteProxyRecipe } from "@/types/sites";
import { hostFromOrigin } from "@/utils/site-links";

export function mountedPaths(mounts: SiteMounts): string[] {
  return listMountedAreas(mounts).map(({ mount }) => mount);
}

function vercelJsonRecipe(origin: string, mounts: string[]): string {
  const rewrites = mounts.flatMap((mount) =>
    mount === "/"
      ? [{ source: "/:path*", destination: `${origin}/:path*` }]
      : [
          { source: mount, destination: `${origin}${mount}` },
          {
            source: `${mount}/:path*`,
            destination: `${origin}${mount}/:path*`,
          },
        ]
  );
  return `${JSON.stringify({ rewrites }, null, 2)}\n`;
}

function nextConfigRecipe(origin: string, mounts: string[]): string {
  const rules = mounts
    .flatMap((mount) =>
      mount === "/"
        ? [`      { source: "/:path*", destination: "${origin}/:path*" },`]
        : [
            `      { source: "${mount}", destination: "${origin}${mount}" },`,
            `      { source: "${mount}/:path*", destination: "${origin}${mount}/:path*" },`,
          ]
    )
    .join("\n");
  return `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
${rules}
    ];
  },
};

export default nextConfig;
`;
}

function nitroRecipe(origin: string, mounts: string[]): string {
  const rules = mounts
    .flatMap((mount) =>
      mount === "/"
        ? [`        "/**": { proxy: "${origin}/**" },`]
        : [
            `        "${mount}": { proxy: "${origin}${mount}" },`,
            `        "${mount}/**": { proxy: "${origin}${mount}/**" },`,
          ]
    )
    .join("\n");
  return `// vite.config.ts (TanStack Start). In a plain Nitro app, put routeRules in nitro.config.ts.
import { defineConfig } from "vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    // ...tanstackStart(), react()
    nitro({
      routeRules: {
${rules}
      },
    }),
  ],
});
`;
}

function netlifyRecipe(origin: string, mounts: string[]): string {
  const rules = mounts.flatMap((mount) =>
    mount === "/"
      ? [`/*  ${origin}/:splat  200!`]
      : [
          `${mount}  ${origin}${mount}  200!`,
          `${mount}/*  ${origin}${mount}/:splat  200!`,
        ]
  );
  return `# public/_redirects (or the folder you publish)
${rules.join("\n")}
`;
}

function cloudflareWorkerRecipe(origin: string, mounts: string[]): string {
  const list = mounts.map((mount) => `"${mount}"`).join(", ");
  return `// Route this Worker on your domain, e.g. ${mounts
    .map((mount) => `example.com${mount === "/" ? "/*" : `${mount}*`}`)
    .join(" and ")}
const SITE_ORIGIN = "${origin}";
const MOUNTS = [${list}];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const mounted = MOUNTS.some(
      (mount) =>
        mount === "/" ||
        url.pathname === mount ||
        url.pathname.startsWith(\`\${mount}/\`)
    );
    if (!mounted) {
      return fetch(request);
    }
    const headers = new Headers(request.headers);
    // Your visitors' sessions stay on your domain.
    headers.delete("cookie");
    headers.delete("authorization");
    // Lets site analytics see the visitor, not Cloudflare.
    headers.set("x-forwarded-for", request.headers.get("cf-connecting-ip") ?? "");
    return fetch(new URL(url.pathname + url.search, SITE_ORIGIN), {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
    });
  },
};
`;
}

function nginxRecipe(origin: string, mounts: string[]): string {
  const host = hostFromOrigin(origin);
  const proxy = `    proxy_pass ${origin};
    proxy_set_header Host ${host};
    proxy_ssl_server_name on;
    proxy_set_header Cookie "";
    proxy_set_header Authorization "";`;
  return `${mounts
    .flatMap((mount) =>
      mount === "/"
        ? [`location / {\n${proxy}\n}`]
        : [
            `location = ${mount} {\n${proxy}\n}`,
            `location ${mount}/ {\n${proxy}\n}`,
          ]
    )
    .join("\n\n")}\n`;
}

export function buildProxyRecipes(
  aliasOrigin: string,
  mounts: SiteMounts
): SiteProxyRecipe[] {
  const origin = aliasOrigin.replace(/\/+$/, "");
  const paths = mountedPaths(mounts);
  return [
    {
      id: "vercel",
      filename: "vercel.json",
      code: vercelJsonRecipe(origin, paths),
    },
    {
      id: "next",
      filename: "next.config.ts",
      code: nextConfigRecipe(origin, paths),
    },
    {
      id: "netlify",
      filename: "_redirects",
      code: netlifyRecipe(origin, paths),
    },
    {
      id: "tanstack",
      filename: "vite.config.ts",
      code: nitroRecipe(origin, paths),
    },
    {
      id: "cloudflare",
      filename: "worker.js",
      code: cloudflareWorkerRecipe(origin, paths),
    },
    { id: "nginx", filename: "nginx.conf", code: nginxRecipe(origin, paths) },
  ];
}
