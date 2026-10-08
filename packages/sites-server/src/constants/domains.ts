export const CLOUDFLARE_ZONES_API =
  "https://api.cloudflare.com/client/v4/zones";
export const PROBE_TIMEOUT_MS = 10_000;
export const PROBE_MAX_BYTES = 8 * 1024;
export const DNS_RESOLVER_TIMEOUT_MS = 3000;
export const DOMAIN_INPUT_SCHEME = /^https?:\/\//;
export const DOMAIN_INPUT_PATH = /\/.*$/;
export const IP_LITERAL = /^(?:\d{1,3}\.){3}\d{1,3}$|^\[?[0-9a-f:]+\]?$/i;
export const CLOUDFLARE_SAAS_MISSING_MESSAGE =
  "Custom subdomains are not set up on this environment.";
export const PROBE_USER_AGENT = "NotraSitesVerifier/1.0";
export const DOMAIN_OWNERSHIP_LABEL = "notra:custom-domain-ownership:v1";
export const DOMAIN_OWNERSHIP_RECORD_PREFIX = "_notra.";
export const DOMAIN_OWNERSHIP_DNS_SERVERS = ["1.1.1.1", "1.0.0.1"];
export const DOMAIN_OWNERSHIP_MAX_RECORDS = 32;
export const DOMAIN_OWNERSHIP_MAX_BYTES = 8192;
