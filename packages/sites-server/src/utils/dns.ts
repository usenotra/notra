import { Resolver } from "node:dns/promises";

import { DNS_RESOLVER_TIMEOUT_MS } from "../constants/domains";

export function createDnsResolver(): Resolver {
  return new Resolver({ timeout: DNS_RESOLVER_TIMEOUT_MS, tries: 2 });
}

export function normalizeDnsName(name: string): string {
  return name.toLowerCase().replace(/\.$/, "");
}

export function zoneCandidates(hostname: string): string[] {
  const labels = normalizeDnsName(hostname).split(".");
  const candidates: string[] = [];
  for (let start = 1; labels.length - start >= 2; start += 1) {
    candidates.push(labels.slice(start).join("."));
  }
  return candidates;
}

export function relativeDnsName(name: string, zone: string): string {
  const host = normalizeDnsName(name);
  return host === zone ? "" : host.slice(0, -(zone.length + 1));
}
