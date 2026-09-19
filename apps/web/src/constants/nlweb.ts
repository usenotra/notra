export const NLWEB_VERSION = "0.55";
export const NLWEB_RESPONSE_FORMAT = "conversational_search";
export const NLWEB_MAX_RESULTS = 5;
export const NLWEB_MIN_SCORE = 1;

export const NLWEB_STOP_WORDS = new Set([
  "about",
  "and",
  "are",
  "can",
  "does",
  "for",
  "from",
  "how",
  "notra",
  "the",
  "this",
  "what",
  "where",
  "with",
  "you",
]);

export const NLWEB_QUERY_ALIASES: Record<string, string[]> = {
  authentication: ["auth", "oauth", "credential", "token"],
  connect: ["connection", "endpoint", "server"],
  cost: ["price", "pricing", "plan"],
  costs: ["price", "pricing", "plan"],
  login: ["auth", "oauth", "credential"],
  plans: ["price", "pricing"],
};
