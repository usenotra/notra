export const DOMAIN_CONNECT_CNAME_TARGET = "cname.notra.site";
export const DOMAIN_CONNECT_OWNERSHIP_VARIABLE = "ownership";
export const DOMAIN_CONNECT_CALLBACK_PATH = "/sites/domain-connect";

export const OWNERSHIP_RECORD_PREFIX = "_cf-custom-hostname.";
export const DOMAIN_CONNECT_HTTP_TIMEOUT_MS = 5000;
export const DOMAIN_CONNECT_DISCOVERY_HOST =
  /^[a-z0-9.-]+(?::\d+)?(?:\/[\w.~%/-]*)?$/i;
export const CALLBACK_TOKEN_SECONDS = 2 * 60 * 60;
export const CALLBACK_TOKEN_LABEL = "domain-connect.";
export const PUBLIC_KEY_CHUNK_LENGTH = 200;
export const DOMAIN_CONNECT_RESERVED_PARAMS = new Set([
  "domain",
  "host",
  "redirect_uri",
  "state",
  "key",
  "sig",
  "providerName",
  "serviceName",
  "groupId",
]);
