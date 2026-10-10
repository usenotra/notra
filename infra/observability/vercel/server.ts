import { createServer } from "node:http";

import { EXPORTER_METRICS, POLL_MS } from "./constants/metrics.ts";
import { vercelApi } from "./utils/api.ts";
import { pollMetrics } from "./utils/poll.ts";

const teamId = process.env.VERCEL_TEAM_ID ?? "";
const api = vercelApi(teamId, process.env.VERCEL_MONITORING_TOKEN);
let snapshot = "";
let completedAt = 0;
let polling = false;
let catalogSuccess = 0;
const metadata = Object.entries(EXPORTER_METRICS)
  .map(([name, help]) => `# HELP ${name} ${help}\n# TYPE ${name} gauge\n`)
  .join("");

async function poll() {
  if (polling) {
    return;
  }
  polling = true;
  try {
    const result = await pollMetrics(api, teamId);
    snapshot = result.text;
    completedAt = Date.now();
    catalogSuccess = 1;
    console.log(
      JSON.stringify({
        event: "vercel.poll",
        catalog: result.catalogCount,
        groups: result.results,
      })
    );
  } catch {
    snapshot = "";
    catalogSuccess = 0;
    console.warn(JSON.stringify({ event: "vercel.poll.failed" }));
  } finally {
    polling = false;
  }
}

const server = createServer((request, response) => {
  if (request.url === "/healthz") {
    // Process liveness, not proof of Vercel access; dashboards expose query status.
    response.end("ok\n");
  } else if (request.url === "/metrics") {
    response.setHeader(
      "content-type",
      "text/plain; version=0.0.4; charset=utf-8"
    );
    const fresh =
      catalogSuccess === 1 &&
      completedAt &&
      Date.now() - completedAt < 2 * POLL_MS;
    response.end(
      `${metadata}notra_vercel_catalog_success ${catalogSuccess}\nnotra_vercel_snapshot_fresh ${Number(Boolean(fresh))}\nnotra_vercel_poll_completed_seconds ${completedAt / 1000}\n${fresh ? snapshot : ""}`
    );
  } else {
    response.writeHead(404).end();
  }
});
server.listen(Number(process.env.PORT || 9091), "::");
void poll();
const interval = setInterval(() => {
  void poll();
}, POLL_MS);
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    clearInterval(interval);
    server.close(() => process.exit(0));
  });
}
