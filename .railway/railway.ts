import { defineRailway, preserve, project, service, volume } from "railway/iac";

import {
  monitoringService,
  monitoringVolume,
} from "./constants/observability.ts";

// Monitoring only: never take ownership of the application's ingest service.
export const partial = "observability";

export default defineRailway((ctx) => {
  if (ctx.projectName !== "notra-prod" || !ctx.isEnvironment("production")) {
    throw new Error("Monitoring IaC requires notra-prod / production.");
  }

  const grafanaVolume = volume("grafana-volume", monitoringVolume);
  const prometheusVolume = volume("prometheus-volume", monitoringVolume);
  const lokiVolume = volume("loki-volume", monitoringVolume);
  const collectorVolume = volume("otel-collector-volume", monitoringVolume);

  // Sources stay unset: upload each existing Docker context with railway up.
  const grafana = service("grafana", {
    ...monitoringService,
    healthcheck: "/api/health",
    volumeMounts: { "/var/lib/grafana": grafanaVolume },
    env: {
      GF_SECURITY_ADMIN_PASSWORD: preserve(),
      GF_SECURITY_SECRET_KEY: preserve(),
      PORT: "3000",
      RAILWAY_RUN_UID: "0",
    },
  });
  const prometheus = service("prometheus", {
    ...monitoringService,
    // Railway rejects /-/ready; verify TSDB readiness privately after deploying.
    healthcheck: "/metrics",
    volumeMounts: { "/prometheus": prometheusVolume },
    env: { PORT: "9090", RAILWAY_RUN_UID: "0" },
  });
  const loki = service("loki", {
    ...monitoringService,
    healthcheck: "/ready",
    volumeMounts: { "/loki": lokiVolume },
    env: { PORT: "3100", RAILWAY_RUN_UID: "0" },
  });
  const collector = service("otel-collector", {
    ...monitoringService,
    healthcheck: "/",
    volumeMounts: { "/var/lib/otelcol": collectorVolume },
    env: {
      NOTRA_OTLP_TOKEN: preserve(),
      PORT: "13133",
      RAILWAY_RUN_UID: "0",
    },
  });
  const blackbox = service("blackbox", {
    ...monitoringService,
    healthcheck: "/",
    env: { PORT: "9115", RAILWAY_RUN_UID: "65534" },
  });
  const tunnel = service("monitoring-tunnel", {
    ...monitoringService,
    healthcheck: "/ready",
    env: { PORT: "2000", TUNNEL_TOKEN: preserve() },
  });
  const vercel = service("vercel-metrics", {
    ...monitoringService,
    healthcheck: "/healthz",
    env: {
      PORT: "9091",
      RAILWAY_RUN_UID: "1000",
      VERCEL_TEAM_ID: "team_J0UtPqQdb8AdDMRkyvJuR8kM",
      VERCEL_MONITORING_TOKEN: preserve(),
    },
  });

  return project("notra-prod", {
    resources: [
      grafana,
      prometheus,
      loki,
      collector,
      blackbox,
      tunnel,
      vercel,
      grafanaVolume,
      prometheusVolume,
      lokiVolume,
      collectorVolume,
    ],
  });
});
