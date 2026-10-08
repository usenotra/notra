import { SITE_BUILD_LIMITS } from "@notra/sites-core/constants/sites";

export const SANDBOX_REQUEST_TIMEOUT_MS = 30_000;
export const SANDBOX_CLEANUP_TIMEOUT_MS = 5_000;
export const SANDBOX_EXEC_TIMEOUT_MS =
  (SITE_BUILD_LIMITS.buildTimeoutSeconds + 60) * 1000;
export const SANDBOX_MAX_RESPONSE_BYTES =
  SITE_BUILD_LIMITS.maxBuildLogBytes * 2 + 1024 * 1024;
export const SANDBOX_LOG_RESPONSE_BYTES =
  SITE_BUILD_LIMITS.maxBuildLogBytes * 6 + 4096;
export const SANDBOX_LOG_TAIL_SCRIPT = String.raw`
const fs = require("node:fs");
const fd = fs.openSync(process.argv[1], "r");
try {
  const size = fs.fstatSync(fd).size;
  const length = Math.min(size, Number(process.argv[2]));
  const bytes = Buffer.alloc(length);
  let read = 0;
  while (read < length) {
    const count = fs.readSync(fd, bytes, read, length - read, size - length + read);
    if (!count) break;
    read += count;
  }
  let start = 0;
  while (start < read && (bytes[start] & 0xc0) === 0x80) start++;
  process.stdout.write(bytes.subarray(start, read));
} finally {
  fs.closeSync(fd);
}
`;
