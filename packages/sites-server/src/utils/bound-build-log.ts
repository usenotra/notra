import { SITE_BUILD_LIMITS } from "@notra/sites-core/constants/sites";

export function boundBuildLog(log: string): string {
  const bytes = Buffer.from(log);
  const limit = SITE_BUILD_LIMITS.maxBuildLogBytes;
  if (bytes.length <= limit) {
    return log;
  }
  const header = log.match(/^(?:\[deployment:[^\n]*\n)+/)?.[0] ?? "";
  let headerEnd = Math.min(Buffer.byteLength(header), limit);
  while (headerEnd > 0 && ((bytes[headerEnd] ?? 0) & 0xc0) === 0x80) {
    headerEnd -= 1;
  }
  let tailStart = bytes.length - (limit - headerEnd);
  while (
    tailStart < bytes.length &&
    ((bytes[tailStart] ?? 0) & 0xc0) === 0x80
  ) {
    tailStart += 1;
  }
  return (
    bytes.subarray(0, headerEnd).toString("utf8") +
    bytes.subarray(tailStart).toString("utf8")
  );
}
