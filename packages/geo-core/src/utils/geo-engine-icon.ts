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
