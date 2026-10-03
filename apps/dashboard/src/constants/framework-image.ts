export const IMAGE_WIDTHS = [
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048,
  3840,
];
export const IMAGE_DEVICE_WIDTHS = [
  640, 750, 828, 1080, 1200, 1920, 2048, 3840,
];
export const IMAGE_REMOTE_HOSTS = new Set([
  "logos.context.dev",
  "pbs.twimg.com",
  "media.brand.dev",
  "models.dev",
]);
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_MAX_PIXELS = 40_000_000;
export const IMAGE_MINIMUM_CACHE_TTL = 14_400;
export const IMAGE_CACHE_MAX_BYTES = 32 * 1024 * 1024;
export const IMAGE_CACHE_MAX_ENTRIES = 256;
export const IMAGE_BLOCKED_IPV4_SUBNETS = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const;
export const IMAGE_BLOCKED_IPV6_SUBNETS = [
  ["::", 96],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 32],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const;
export const IMAGE_SECURITY_HEADERS = {
  "Content-Disposition": 'attachment; filename="image"',
  "Content-Security-Policy": "default-src 'self'; script-src 'none'; sandbox;",
  "X-Content-Type-Options": "nosniff",
  Vary: "Accept",
};
