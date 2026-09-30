import { defineAgent } from "eve";

import { createAssistantModel } from "./lib/utils/model";

export default defineAgent({
  build: {
    externalDependencies: [
      "@ai-sdk/devtools",
      "@ai-sdk/gateway",
      "@aws-sdk/client-s3",
      "@vercel/oidc",
      "@linear/sdk",
      "@octokit/core",
      "@resvg/resvg-js",
      "@upstash/box",
      "@upstash/redis",
      "marked",
      "pg",
      "sanitize-html",
      "satori",
      "satori-html",
    ],
  },
  model: createAssistantModel(),
});
