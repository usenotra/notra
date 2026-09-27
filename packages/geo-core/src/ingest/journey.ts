import { createHmac } from "node:crypto";

import {
  GEO_JOURNEY_BROWSE_BUCKET_SECONDS,
  GEO_JOURNEY_BROWSE_CATEGORY,
  GEO_JOURNEY_BUCKET_SECONDS,
  GEO_JOURNEY_EXPLICIT_PREFIX,
  GEO_JOURNEY_FINGERPRINT_PREFIX,
  GEO_JOURNEY_HASH_LENGTH,
  GEO_JOURNEY_IPV4_OCTETS,
  GEO_JOURNEY_IPV6_GROUPS,
  GEO_JOURNEY_PARAM,
} from "@notra/geo-core/constants/geo";
import { getGeoIngestSecret } from "@notra/geo-core/geo/ingest";
import { getJourneyId } from "@usenotra/geo/markdown";

import type {
  GeoJourneyInput,
  GeoJourneyResolution,
  GeoJourneyTuning,
} from "../types/ingest";

const MS_PER_SECOND = 1000;
const ISO_DATE_LENGTH = 10;

function toTuning(category: string): GeoJourneyTuning {
  if (category === GEO_JOURNEY_BROWSE_CATEGORY) {
    return { bucketSeconds: GEO_JOURNEY_BROWSE_BUCKET_SECONDS, fullIp: true };
  }
  return { bucketSeconds: GEO_JOURNEY_BUCKET_SECONDS, fullIp: false };
}

function toIpKey(ip: string | undefined, tuning: GeoJourneyTuning): string {
  const value = ip?.trim();
  if (!value) {
    return "";
  }
  if (tuning.fullIp) {
    return value;
  }
  if (value.includes(":")) {
    return value.split(":").slice(0, GEO_JOURNEY_IPV6_GROUPS).join(":");
  }
  return value.split(".").slice(0, GEO_JOURNEY_IPV4_OCTETS).join(".");
}

function toTimeBucket(capturedAt: Date, tuning: GeoJourneyTuning): number {
  const seconds = Math.floor(capturedAt.getTime() / MS_PER_SECOND);
  return Math.floor(seconds / tuning.bucketSeconds);
}

function toRotatingSalt(capturedAt: Date): string | null {
  const secret = getGeoIngestSecret();
  if (!secret) {
    return null;
  }
  const day = capturedAt.toISOString().slice(0, ISO_DATE_LENGTH);
  return `${secret}|${day}`;
}

function toFingerprint(input: GeoJourneyInput): string {
  const salt = toRotatingSalt(input.capturedAt);
  if (!salt) {
    return "";
  }
  const tuning = toTuning(input.category);
  const parts = [
    input.source,
    toIpKey(input.ip, tuning),
    String(toTimeBucket(input.capturedAt, tuning)),
  ];
  const digest = createHmac("sha256", salt)
    .update(parts.join("|"))
    .digest("hex");
  return `${GEO_JOURNEY_FINGERPRINT_PREFIX}${digest.slice(0, GEO_JOURNEY_HASH_LENGTH)}`;
}

function toCleanPath(url: URL): string {
  const cleaned = new URL(url.toString());
  cleaned.searchParams.delete(GEO_JOURNEY_PARAM);
  return cleaned.pathname;
}

export function resolveJourneyId(input: GeoJourneyInput): GeoJourneyResolution {
  const explicit = getJourneyId(input.url);
  if (explicit) {
    return {
      journeyId: `${GEO_JOURNEY_EXPLICIT_PREFIX}${explicit}`,
      path: toCleanPath(input.url),
    };
  }
  const journeyId = input.visitorType === "crawler" ? toFingerprint(input) : "";
  return { journeyId, path: toCleanPath(input.url) };
}
