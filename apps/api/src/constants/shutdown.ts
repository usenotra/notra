import type { ApiShutdownTimeouts } from "../types/shutdown";

export const API_SHUTDOWN_TIMEOUTS: ApiShutdownTimeouts = {
  requestsMs: 30_000,
  telemetryMs: 20_000,
};
