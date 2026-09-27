import {
  GEO_AI_REFERRER_HOSTS,
  GEO_BROWSER_UA_PATTERNS,
  GEO_NON_AI_BOT_PATTERNS,
} from "@notra/geo-core/constants/geo";
import {
  GEO_ACCEPT_FINGERPRINT_CONFIDENCE,
  GEO_ACCEPT_FINGERPRINTS,
  GEO_BROWSER_IMITATION_AGENT,
  GEO_BROWSER_IMITATION_CONFIDENCE,
  GEO_CHROMIUM_UA_PATTERNS,
  GEO_CLI_CLIENT_PATTERNS,
  GEO_CLI_EXACT_USER_AGENTS,
  GEO_MARKDOWN_NEGOTIATION_AGENT,
  GEO_MARKDOWN_NEGOTIATION_CATEGORY,
  GEO_MARKDOWN_NEGOTIATION_CONFIDENCE,
} from "@notra/geo-core/constants/geo-accept";
import { classifyUserAgent } from "@usenotra/geo/classify";

import type {
  GeoVisitorClassification,
  GeoVisitorInput,
  GeoVisitorSignals,
} from "../types/ingest";
import { normalizeAccept, prefersMarkdown } from "../utils/geo-accept";

const UNKNOWN_CLASSIFICATION: GeoVisitorClassification = {
  visitorType: "unknown",
  source: "unknown",
  agent: "",
  category: "",
  confidence: "",
};

const HUMAN_CLASSIFICATION: GeoVisitorClassification = {
  visitorType: "human",
  source: "human",
  agent: "",
  category: "",
  confidence: "",
};

function matchesHost(host: string, key: string): boolean {
  return host === key || host.endsWith(`.${key}`);
}

export function resolveAiReferrer(referer: string | undefined): string | null {
  if (!referer) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(referer);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const hostWithPath = `${host}${parsed.pathname.toLowerCase()}`;

  for (const [key, assistant] of Object.entries(GEO_AI_REFERRER_HOSTS)) {
    if (key.includes("/")) {
      if (hostWithPath.startsWith(key)) {
        return assistant;
      }
      continue;
    }
    if (matchesHost(host, key)) {
      return assistant;
    }
  }

  return null;
}

function classifyByAccept(
  userAgent: string,
  accept: string | undefined
): GeoVisitorClassification | null {
  const haystack = userAgent.toLowerCase();
  const normalized = normalizeAccept(accept);
  for (const fingerprint of GEO_ACCEPT_FINGERPRINTS) {
    if (
      haystack.includes(fingerprint.userAgentPattern) &&
      normalized === normalizeAccept(fingerprint.accept)
    ) {
      return {
        visitorType: "crawler",
        source: fingerprint.agent,
        agent: fingerprint.agent,
        category: GEO_MARKDOWN_NEGOTIATION_CATEGORY,
        confidence: GEO_ACCEPT_FINGERPRINT_CONFIDENCE,
      };
    }
  }
  if (prefersMarkdown(accept)) {
    return {
      visitorType: "crawler",
      source: GEO_MARKDOWN_NEGOTIATION_AGENT,
      agent: GEO_MARKDOWN_NEGOTIATION_AGENT,
      category: GEO_MARKDOWN_NEGOTIATION_CATEGORY,
      confidence: GEO_MARKDOWN_NEGOTIATION_CONFIDENCE,
    };
  }
  return null;
}

function looksLikeBrowser(haystack: string): boolean {
  return GEO_BROWSER_UA_PATTERNS.some((pattern) => haystack.includes(pattern));
}

function classifyBySignals(
  userAgent: string,
  signals: GeoVisitorSignals | undefined
): GeoVisitorClassification | null {
  if (!signals) {
    return null;
  }
  const haystack = userAgent.toLowerCase();
  if (!looksLikeBrowser(haystack)) {
    return null;
  }
  const claimsChromium = GEO_CHROMIUM_UA_PATTERNS.some((pattern) =>
    haystack.includes(pattern)
  );
  const missingClientHints = claimsChromium && !signals.clientHints;
  const missingFetchMetadata = signals.fetchMode === null;
  if (!(missingClientHints || missingFetchMetadata || signals.tracing)) {
    return null;
  }
  return {
    visitorType: "crawler",
    source: GEO_BROWSER_IMITATION_AGENT,
    agent: GEO_BROWSER_IMITATION_AGENT,
    category: GEO_MARKDOWN_NEGOTIATION_CATEGORY,
    confidence: GEO_BROWSER_IMITATION_CONFIDENCE,
  };
}

function classifyCliClient(userAgent: string): GeoVisitorClassification | null {
  const haystack = userAgent.toLowerCase();
  const exact = GEO_CLI_EXACT_USER_AGENTS[haystack];
  const match =
    exact ??
    GEO_CLI_CLIENT_PATTERNS.find((entry) => haystack.includes(entry.pattern))
      ?.agent;
  if (!match) {
    return null;
  }
  return {
    visitorType: "unknown",
    source: match,
    agent: match,
    category: "",
    confidence: "",
  };
}

export function classifyVisitor(
  input: GeoVisitorInput
): GeoVisitorClassification {
  const userAgent = input.userAgent?.trim() ?? "";

  if (userAgent.length > 0) {
    const match = classifyUserAgent(userAgent);
    if (match) {
      return {
        visitorType: "crawler",
        source: match.agent,
        agent: match.agent,
        category: match.category,
        confidence: match.confidence,
      };
    }
  }

  const byAccept = classifyByAccept(userAgent, input.accept);
  if (byAccept) {
    return byAccept;
  }

  const bySignals = classifyBySignals(userAgent, input.signals);
  if (bySignals) {
    return bySignals;
  }

  const assistant = resolveAiReferrer(input.referer);
  if (assistant) {
    return {
      visitorType: "ai_referral",
      source: assistant,
      agent: "",
      category: "assistant-referral",
      confidence: "reported",
    };
  }

  if (userAgent.length === 0) {
    return UNKNOWN_CLASSIFICATION;
  }

  const cli = classifyCliClient(userAgent);
  if (cli) {
    return cli;
  }

  const haystack = userAgent.toLowerCase();
  const isKnownBot = GEO_NON_AI_BOT_PATTERNS.some((pattern) =>
    haystack.includes(pattern)
  );
  const isBrowser = GEO_BROWSER_UA_PATTERNS.some((pattern) =>
    haystack.includes(pattern)
  );

  if (isKnownBot || isBrowser) {
    return HUMAN_CLASSIFICATION;
  }

  return UNKNOWN_CLASSIFICATION;
}
