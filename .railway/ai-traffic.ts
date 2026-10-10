import { defineRailway, github, preserve, project, service } from "railway/iac";

export const partial = "ai-traffic";

export default defineRailway((ctx) => {
  if (ctx.projectName !== "notra-prod" || ctx.environment !== "production") {
    throw new Error("AI traffic IaC requires notra-prod / production.");
  }

  const ingest = service("ai-traffic-ingest", {
    source: github("usenotra/notra", { branch: null, rootDirectory: "/" }),
    build: {
      buildEnvironment: "V3",
      builder: "DOCKERFILE",
      dockerfilePath: "apps/ai-traffic-ingest/Dockerfile",
    },
    healthcheck: "/readyz",
    healthcheckTimeout: 60,
    replicas: { "us-east4-eqdc4a": 2 },
    deploy: {
      drainingSeconds: 60,
      restartPolicyMaxRetries: 5,
    },
    domains: [{ domain: "ingest.usenotra.com", port: 3000 }],
    env: {
      AXIOM_TOKEN: preserve(),
      DATABASE_URL: preserve(),
      GEO_INGEST_SECRET: preserve(),
      NEXT_PUBLIC_POSTHOG_HOST: preserve(),
      NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: preserve(),
      PORT: preserve(),
      RAILWAY_DEPLOYMENT_DRAINING_SECONDS: preserve(),
      TINYBIRD_BASE_URL: preserve(),
      TINYBIRD_TOKEN: preserve(),
      UPSTASH_REDIS_REST_TOKEN: preserve(),
      UPSTASH_REDIS_REST_URL: preserve(),
    },
  });

  return project("notra-prod", { resources: [ingest] });
});
