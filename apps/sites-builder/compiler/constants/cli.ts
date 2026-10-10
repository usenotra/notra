export const USAGE = `notra-sites <command>

  validate [--source <dir>] [--json]        Check blog.json, MDX and snippets
  build --source <dir> --target <file> --out <dir> [--json]
  dev [--source <dir>] [--area blog|changelog] [--port 4321]   (serves every area; --area picks the one "/" redirects to)`;

export const DEV_READY_TIMEOUT_MS = 60_000;
export const DEV_READY_POLL_MS = 200;
export const DEV_STOP_TIMEOUT_MS = 5000;
