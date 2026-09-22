import { normalizeCompetitorDomain } from "../geo/domain";
import type { EngineIconKey, EngineIconRule } from "../types/geo";

const ENGINE_ICON_RULES: readonly EngineIconRule[] = [
  {
    key: "tencent",
    patterns: ["tencent", "hunyuan", "hy3"],
  },
  {
    key: "xiaomi",
    patterns: ["xiaomi"],
  },
  {
    key: "copilot",
    patterns: ["copilot", "bingbot", "microsoft", "bing/"],
  },
  {
    key: "cursor",
    patterns: ["cursor", "composer", "anysphere"],
  },
  {
    key: "opencode",
    patterns: ["opencode"],
  },
  {
    key: "claude-code",
    patterns: ["claude-code", "claude code"],
  },
  {
    key: "codex",
    patterns: ["codex"],
  },
  {
    key: "openai",
    patterns: ["openai", "gpt", "chatgpt", "oai-"],
  },
  {
    key: "claude",
    patterns: ["anthropic", "claude"],
  },
  {
    key: "google",
    patterns: [
      "ai-overview",
      "google-agent",
      "google-cloudvertex",
      "googleother",
      "googlebot",
    ],
  },
  {
    key: "gemini",
    patterns: ["gemini", "google", "bard", "palm"],
  },
  {
    key: "apple",
    patterns: ["applebot", "apple"],
  },
  {
    key: "amazon",
    patterns: ["amazonbot", "amzn-"],
    exact: ["amazon"],
  },
  {
    key: "duckduckgo",
    patterns: ["duckassist", "duckduckgo"],
  },
  {
    key: "cloudflare",
    patterns: ["cloudflare"],
  },
  {
    key: "tiktok",
    patterns: ["tiktok", "bytespider", "bytedance", "trae"],
  },
  {
    key: "mozilla",
    patterns: ["tabstack"],
  },
  {
    key: "manus",
    patterns: ["manus"],
  },
  {
    key: "firecrawl",
    patterns: ["firecrawl"],
  },
  {
    key: "cohere",
    patterns: ["cohere"],
  },
  {
    key: "kimi",
    patterns: ["kimi", "moonshot"],
  },
  {
    key: "zai",
    patterns: ["chatglm", "zhipu", "glm-", "zai/", "z.ai/", "z-ai/"],
    exact: ["glm", "zai", "z.ai", "z-ai"],
  },
  {
    key: "exa",
    patterns: ["exabot", "exasearchbot"],
    exact: ["exa"],
  },
  {
    key: "parallel",
    patterns: ["shapbot", "shap-user"],
    exact: ["parallel"],
  },
  {
    key: "commoncrawl",
    patterns: ["ccbot", "common crawl", "commoncrawl"],
  },
  {
    key: "youcom",
    patterns: ["youbot", "you.com"],
    exact: ["you"],
  },
  {
    key: "liner",
    patterns: ["linerbot", "liner"],
  },
  {
    key: "cline",
    patterns: ["cline", "agentbot", "vscodeextension"],
  },
  {
    key: "devin",
    patterns: ["devin", "cognition"],
  },
  {
    key: "diffbot",
    patterns: ["diffbot"],
  },
  {
    key: "tavily",
    patterns: ["tavily"],
  },
  {
    key: "timpi",
    patterns: ["timpi"],
  },
  {
    key: "huawei",
    patterns: ["pangubot", "huawei", "petalbot"],
  },
  {
    key: "kagi",
    patterns: ["kagi"],
  },
  {
    key: "perplexity",
    patterns: ["perplexity", "sonar"],
  },
  {
    key: "mistral",
    patterns: ["mistral", "mixtral", "magistral", "codestral", "ministral"],
  },
  {
    key: "deepseek",
    patterns: ["deepseek"],
  },
  {
    key: "instagram",
    patterns: ["instagram", "instagr.am"],
  },
  {
    key: "meta",
    patterns: ["meta-", "meta/", "llama", "facebook", "muse-spark"],
    exact: ["meta"],
  },
  {
    key: "grok",
    patterns: ["grok", "x-ai", "xai", "spacexai"],
  },
  {
    key: "qwen",
    patterns: ["qwen", "qwq", "alibaba", "tongyi"],
  },
  {
    key: "cli",
    patterns: [
      "curl",
      "wget",
      "python-",
      "aiohttp",
      "go-http-client",
      "node-fetch",
      "node.js fetch",
      "undici",
      "axios",
      "bun",
      "deno",
      "java http",
      "okhttp",
      "libwww",
      "postman",
      "insomnia",
      "httpie",
    ],
  },
  {
    key: "agent",
    patterns: [
      "ai2bot",
      "omgili",
      "yiyanbot",
      "baidu",
      "browser-imitating",
      "markdown-negotiating",
    ],
  },
];

export function resolveEngineIconKey(engine: string): EngineIconKey | null {
  const value = engine.trim().toLowerCase();
  if (value.length === 0) {
    return null;
  }
  for (const rule of ENGINE_ICON_RULES) {
    if (rule.exact?.includes(value)) {
      return rule.key;
    }
  }
  for (const rule of ENGINE_ICON_RULES) {
    if (rule.patterns.some((pattern) => value.includes(pattern))) {
      return rule.key;
    }
  }
  return null;
}

const BRAND_NAME_PATTERN = /[^a-z0-9]+/g;

/**
 * Product names and hosts whose remote logo is a black mark. Visibility
 * already draws these with the themed engine SVGs; brand rows should too.
 * Exact names only — substring matching would turn "Google" into Gemini.
 */
const BRAND_ICON_BY_NAME: Record<string, EngineIconKey> = {
  chatgpt: "openai",
  openai: "openai",
  claude: "claude",
  anthropic: "claude",
  claudeai: "claude",
  claudecode: "claude-code",
  gemini: "gemini",
  perplexity: "perplexity",
  grok: "grok",
  xai: "grok",
  kimi: "kimi",
  moonshot: "kimi",
  deepseek: "deepseek",
  mistral: "mistral",
  copilot: "copilot",
  microsoftcopilot: "copilot",
  qwen: "qwen",
  cursor: "cursor",
  opencode: "opencode",
  codex: "codex",
  glm: "zai",
  zai: "zai",
  hunyuan: "tencent",
};

const BRAND_ICON_BY_HOST: Record<string, EngineIconKey> = {
  "chatgpt.com": "openai",
  "chat.openai.com": "openai",
  "openai.com": "openai",
  "claude.ai": "claude",
  "anthropic.com": "claude",
  "gemini.google.com": "gemini",
  "bard.google.com": "gemini",
  "perplexity.ai": "perplexity",
  "grok.com": "grok",
  "x.ai": "grok",
  "deepseek.com": "deepseek",
  "chat.deepseek.com": "deepseek",
  "mistral.ai": "mistral",
  "chat.mistral.ai": "mistral",
  "kimi.ai": "kimi",
  "kimi.com": "kimi",
  "moonshot.cn": "kimi",
  "cursor.com": "cursor",
  "cursor.sh": "cursor",
  "copilot.microsoft.com": "copilot",
  "qwen.ai": "qwen",
  "chat.qwen.ai": "qwen",
  "chat.z.ai": "zai",
  "z.ai": "zai",
};

function brandNameKey(name: string): string {
  return name.trim().toLowerCase().replace(BRAND_NAME_PATTERN, "");
}

export function brandEngineIconKey(
  name: string,
  domain?: string | null
): EngineIconKey | null {
  if (domain) {
    const host = normalizeCompetitorDomain(domain);
    if (host) {
      const fromHost = BRAND_ICON_BY_HOST[host];
      if (fromHost) {
        return fromHost;
      }
    }
  }
  return BRAND_ICON_BY_NAME[brandNameKey(name)] ?? null;
}
