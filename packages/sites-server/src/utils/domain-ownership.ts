import { createHmac, timingSafeEqual } from "node:crypto";

import type { SiteDomainVerificationRecord } from "@notra/db/types/sites";
import { normalizeHostname } from "@notra/sites-core/utils/hosts";

import {
  DOMAIN_OWNERSHIP_DNS_SERVERS,
  DOMAIN_OWNERSHIP_LABEL,
  DOMAIN_OWNERSHIP_MAX_BYTES,
  DOMAIN_OWNERSHIP_MAX_RECORDS,
  DOMAIN_OWNERSHIP_RECORD_PREFIX,
} from "../constants/domains";
import { getSitesPreviewSecret } from "../env";
import { createDnsResolver } from "./dns";

export function domainOwnershipRecord(
  siteId: string,
  hostname: string
): SiteDomainVerificationRecord {
  const host = normalizeHostname(hostname);
  const signature = createHmac("sha256", getSitesPreviewSecret())
    .update(JSON.stringify([DOMAIN_OWNERSHIP_LABEL, siteId, host]))
    .digest("base64url");
  return {
    type: "TXT",
    name: `${DOMAIN_OWNERSHIP_RECORD_PREFIX}${host}`,
    value: `notra-domain-v1=${signature}`,
    purpose: "ownership",
  };
}

export async function verifyDomainOwnership(
  siteId: string,
  hostname: string
): Promise<boolean> {
  const expected = domainOwnershipRecord(siteId, hostname);
  const resolver = createDnsResolver();
  resolver.setServers(DOMAIN_OWNERSHIP_DNS_SERVERS);
  try {
    const records = await resolver.resolveTxt(expected.name);
    if (records.length > DOMAIN_OWNERSHIP_MAX_RECORDS) {
      return false;
    }
    let bytes = 0;
    for (const record of records) {
      for (const chunk of record) {
        bytes += Buffer.byteLength(chunk);
        if (bytes > DOMAIN_OWNERSHIP_MAX_BYTES) {
          return false;
        }
      }
    }
    const wanted = Buffer.from(expected.value);
    return records.some((record) => {
      const given = Buffer.from(record.join(""));
      return given.length === wanted.length && timingSafeEqual(given, wanted);
    });
  } catch {
    return false;
  } finally {
    resolver.cancel();
  }
}
