import type { OpencodeMcpServer, OpencodeMcpStatus } from "../types/opencode";

export const OPENCODE_DEFAULT_PLACEHOLDER =
  'Ask anything... "Fix a TODO in the codebase"';

export const OPENCODE_DEFAULT_VERSION = "1.18.25";

export const OPENCODE_DEFAULT_CWD = "~/acme/web";

export const OPENCODE_DEFAULT_SERVERS: OpencodeMcpServer[] = [
  { name: "notra", status: "Connected" },
  { name: "github", status: "Connected" },
  { name: "linear", status: "Connected" },
];

export const OPENCODE_MCP_STATUS_CLASS: Record<OpencodeMcpStatus, string> = {
  Connected: "text-opencode-green",
  Disconnected: "text-opencode-muted",
  Error: "text-opencode-orange",
};

/** Beat before the first tool line during a replay. */
export const OPENCODE_SEARCH_HEADER_MS = 140;

/** Cadence between sequential tool lines. */
export const OPENCODE_SEARCH_QUERY_MS = 280;

/** Delay between cited-source rows. */
export const OPENCODE_SEARCH_STAGGER_MS = 56;

/** Pause after the last query before the sources block. */
export const OPENCODE_SEARCH_SOURCES_MS = 160;

export const OPENCODE_REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
