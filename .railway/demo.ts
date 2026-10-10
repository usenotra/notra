import { defineRailway, github, preserve, project, service } from "railway/iac";

export default defineRailway((ctx) => {
  if (ctx.projectName !== "notra-demo" || ctx.environment !== "production") {
    throw new Error("Demo IaC requires notra-demo / production.");
  }

  const demoApi = service("demo-api", {
    source: github("usenotra/notra", { branch: null, rootDirectory: "/" }),
    build: {
      buildEnvironment: "V3",
      builder: "DOCKERFILE",
      dockerfilePath: "apps/api/Dockerfile",
    },
    replicas: { "us-east4-eqdc4a": 1 },
    domains: ["demo-api.usenotra.com"],
    env: {
      CRON_SECRET: preserve(),
      DATABASE_URL: preserve(),
      GEO_INGEST_SECRET: preserve(),
      INTEGRATION_ENCRYPTION_KEY: preserve(),
      INTERNAL_WORKFLOW_SECRET: preserve(),
      NEXT_PUBLIC_APP_URL: preserve(),
      NEXT_PUBLIC_NOTRA_DEMO_API_URL: preserve(),
      NEXT_PUBLIC_NOTRA_DEMO_MODE: preserve(),
      NEXT_PUBLIC_SITE_URL: preserve(),
      NOTRA_DEMO_API_URL: preserve(),
      NOTRA_DEMO_DASHBOARD_ORIGIN: preserve(),
      NOTRA_DEMO_MODE: preserve(),
      QSTASH_TOKEN: preserve(),
      RAILWAY_DOCKERFILE_PATH: preserve(),
      TZ: preserve(),
      UNKEY_API_ID: preserve(),
      UNKEY_ROOT_KEY: preserve(),
      UPSTASH_REDIS_REST_TOKEN: preserve(),
      UPSTASH_REDIS_REST_URL: preserve(),
      WORKFLOW_BASE_URL: preserve(),
      WORKOS_COOKIE_PASSWORD: preserve(),
    },
  });

  const dashboard = service("dashboard", {
    source: github("usenotra/notra", { branch: null }),
    build: {
      buildEnvironment: "V3",
      builder: "DOCKERFILE",
      dockerfilePath: "apps/dashboard/Dockerfile",
    },
    healthcheck: "/api/healthcheck",
    healthcheckTimeout: 300,
    preDeploy:
      "sh -c 'if [ -x /migrate/run.sh ]; then /migrate/run.sh; else cd /app && DATABASE_URL=$MIGRATION_DATABASE_URL bun run db:migrate; fi'",
    replicas: { "us-east4-eqdc4a": 1 },
    domains: ["demo.usenotra.com"],
    env: {
      CRON_SECRET: preserve(),
      DATABASE_URL: preserve(),
      GEO_INGEST_SECRET: preserve(),
      INTEGRATION_ENCRYPTION_KEY: preserve(),
      INTERNAL_WORKFLOW_SECRET: preserve(),
      MIGRATION_DATABASE_URL: preserve(),
      NEXT_PUBLIC_APP_URL: preserve(),
      NEXT_PUBLIC_DATABUDDY_DEMO_DASHBOARD_WEBSITE_ID: preserve(),
      NEXT_PUBLIC_NOTRA_DEMO_API_URL: preserve(),
      NEXT_PUBLIC_NOTRA_DEMO_MODE: preserve(),
      NEXT_PUBLIC_SITE_URL: preserve(),
      NOTRA_DEMO_API_URL: preserve(),
      NOTRA_DEMO_DASHBOARD_ORIGIN: preserve(),
      NOTRA_DEMO_MODE: preserve(),
      QSTASH_TOKEN: preserve(),
      RAILWAY_DOCKERFILE_PATH: preserve(),
      TZ: preserve(),
      UNKEY_API_ID: preserve(),
      UNKEY_ROOT_KEY: preserve(),
      UPSTASH_REDIS_REST_TOKEN: preserve(),
      UPSTASH_REDIS_REST_URL: preserve(),
      WORKFLOW_BASE_URL: preserve(),
      WORKOS_COOKIE_PASSWORD: preserve(),
    },
  });

  return project("notra-demo", { resources: [demoApi, dashboard] });
});
