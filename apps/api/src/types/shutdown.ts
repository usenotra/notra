export interface ApiServerControl {
  stop(closeActiveConnections?: boolean): Promise<void>;
}

export interface ApiShutdownTimeouts {
  requestsMs: number;
  telemetryMs: number;
}
