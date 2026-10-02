import type { CrawlerIpRange, IpVersion, ParsedIp } from "@/types/ip-checker";

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const HEXTET_PATTERN = /^[0-9a-f]{1,4}$/;
const IPV4_MAPPED_PREFIX = "::ffff:";
const HEXTET_BITS = 16;
const IPV4_BITS = 32;
const IPV4_BITS_BIGINT = BigInt(IPV4_BITS);
const IPV4_MAPPED_HIGH_BITS = (1n << BigInt(HEXTET_BITS)) - 1n;
const IPV4_MASK = (1n << IPV4_BITS_BIGINT) - 1n;
const CIDR_PATTERN = /^([^/\s]+)(?:\/(\d{1,3}))?$/;
const IPV6_BITS = 128;
const IPV6_GROUPS = 8;
const OCTET_MAX = 255;

function parseIpv4(input: string): bigint | null {
  const match = IPV4_PATTERN.exec(input);
  if (!match) {
    return null;
  }
  let value = 0n;
  for (const octet of match.slice(1, 5)) {
    const number = Number(octet);
    if (number > OCTET_MAX) {
      return null;
    }
    value = (value << 8n) | BigInt(number);
  }
  return value;
}

function expandIpv6Groups(input: string): string[] | null {
  const parts = input.split("::");
  if (parts.length > 2) {
    return null;
  }
  const head = parts[0] ? parts[0].split(":") : [];
  const tail = parts.length === 2 && parts[1] ? parts[1].split(":") : [];
  const lastGroup = (tail.length > 0 ? tail : head).at(-1);
  if (lastGroup?.includes(".")) {
    const embedded = parseIpv4(lastGroup);
    if (embedded === null) {
      return null;
    }
    const high = (embedded >> 16n).toString(16);
    const low = (embedded & 0xffffn).toString(16);
    const target = tail.length > 0 ? tail : head;
    target.splice(-1, 1, high, low);
  }
  if (parts.length === 1) {
    return head.length === IPV6_GROUPS ? head : null;
  }
  const missing = IPV6_GROUPS - head.length - tail.length;
  if (missing < 1) {
    return null;
  }
  return [...head, ...new Array<string>(missing).fill("0"), ...tail];
}

function parseIpv6(input: string): bigint | null {
  const groups = expandIpv6Groups(input);
  if (!groups) {
    return null;
  }
  let value = 0n;
  for (const group of groups) {
    if (!HEXTET_PATTERN.test(group)) {
      return null;
    }
    value = (value << BigInt(HEXTET_BITS)) | BigInt(Number.parseInt(group, 16));
  }
  return value;
}

function formatIpv4(value: bigint): string {
  return [24n, 16n, 8n, 0n]
    .map((shift) => String((value >> shift) & 0xffn))
    .join(".");
}

export function parseIp(input: string): ParsedIp | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return parseIp(trimmed.slice(1, -1));
  }
  if (trimmed.startsWith(IPV4_MAPPED_PREFIX)) {
    const mapped = parseIp(trimmed.slice(IPV4_MAPPED_PREFIX.length));
    if (mapped?.version === "v4") {
      return mapped;
    }
  }
  const v4 = parseIpv4(trimmed);
  if (v4 !== null) {
    return { version: "v4", value: v4, normalized: trimmed };
  }
  if (!trimmed.includes(":")) {
    return null;
  }
  const v6 = parseIpv6(trimmed);
  if (v6 === null) {
    return null;
  }
  const highBits: bigint = v6 >> IPV4_BITS_BIGINT;
  if (highBits === IPV4_MAPPED_HIGH_BITS) {
    const v4: bigint = v6 & IPV4_MASK;
    return { version: "v4", value: v4, normalized: formatIpv4(v4) };
  }
  return { version: "v6", value: v6, normalized: trimmed };
}

export function parseCidr(prefix: string): CrawlerIpRange | null {
  const match = CIDR_PATTERN.exec(prefix.trim());
  if (!match) {
    return null;
  }
  const [, address, lengthText] = match;
  if (!address) {
    return null;
  }
  const parsed = parseIp(address);
  if (!parsed) {
    return null;
  }
  const bits = parsed.version === "v4" ? IPV4_BITS : IPV6_BITS;
  const length = lengthText === undefined ? bits : Number(lengthText);
  if (!Number.isInteger(length) || length < 0 || length > bits) {
    return null;
  }
  const hostBits = BigInt(bits - length);
  const start = (parsed.value >> hostBits) << hostBits;
  const end = start + (1n << hostBits) - 1n;
  return { prefix: prefix.trim(), version: parsed.version, start, end };
}

export function rangeContains(
  range: CrawlerIpRange,
  version: IpVersion,
  value: bigint
): boolean {
  return (
    range.version === version && value >= range.start && value <= range.end
  );
}
