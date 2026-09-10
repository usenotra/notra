import type { EngineIconKey } from "@notra/geo-core/types/geo";
import { Amazon } from "@notra/ui/components/ui/svgs/amazon";
import { Apple } from "@notra/ui/components/ui/svgs/apple";
import { AppleDark } from "@notra/ui/components/ui/svgs/appleDark";
import { ClaudeAiIcon } from "@notra/ui/components/ui/svgs/claudeAiIcon";
import { Cline } from "@notra/ui/components/ui/svgs/cline";
import { Cloudflare } from "@notra/ui/components/ui/svgs/cloudflare";
import { Cohere } from "@notra/ui/components/ui/svgs/cohere";
import { CommonCrawl } from "@notra/ui/components/ui/svgs/commonCrawl";
import { Cursor } from "@notra/ui/components/ui/svgs/cursor";
import { Deepseek } from "@notra/ui/components/ui/svgs/deepseek";
import { Devin } from "@notra/ui/components/ui/svgs/devin";
import { Diffbot } from "@notra/ui/components/ui/svgs/diffbot";
import { DuckDuckGo } from "@notra/ui/components/ui/svgs/duckDuckGo";
import { Exa } from "@notra/ui/components/ui/svgs/exa";
import { Firecrawl } from "@notra/ui/components/ui/svgs/firecrawl";
import { FirecrawlDark } from "@notra/ui/components/ui/svgs/firecrawlDark";
import { Firefox } from "@notra/ui/components/ui/svgs/firefox";
import { Google } from "@notra/ui/components/ui/svgs/google";
import { Grok } from "@notra/ui/components/ui/svgs/grok";
import { GrokDark } from "@notra/ui/components/ui/svgs/grokDark";
import { Huawei } from "@notra/ui/components/ui/svgs/huawei";
import { Kagi } from "@notra/ui/components/ui/svgs/kagi";
import { Kimi } from "@notra/ui/components/ui/svgs/kimi";
import { Liner } from "@notra/ui/components/ui/svgs/liner";
import { Manus } from "@notra/ui/components/ui/svgs/manus";
import { ManusDark } from "@notra/ui/components/ui/svgs/manusDark";
import { Meta } from "@notra/ui/components/ui/svgs/meta";
import { Mistral } from "@notra/ui/components/ui/svgs/mistral";
import { Openai } from "@notra/ui/components/ui/svgs/openai";
import { OpenaiDark } from "@notra/ui/components/ui/svgs/openaiDark";
import { Opencode } from "@notra/ui/components/ui/svgs/opencode";
import { OpencodeDark } from "@notra/ui/components/ui/svgs/opencodeDark";
import { Qwen } from "@notra/ui/components/ui/svgs/qwen";
import { QwenDark } from "@notra/ui/components/ui/svgs/qwenDark";
import { Tavily } from "@notra/ui/components/ui/svgs/tavily";
import { Tencent } from "@notra/ui/components/ui/svgs/tencent";
import { TikTok } from "@notra/ui/components/ui/svgs/tikTok";
import { TikTokDark } from "@notra/ui/components/ui/svgs/tikTokDark";
import { Timpi } from "@notra/ui/components/ui/svgs/timpi";
import { Xiaomi } from "@notra/ui/components/ui/svgs/xiaomi";
import { YouCom } from "@notra/ui/components/ui/svgs/youCom";
import { Zai } from "@notra/ui/components/ui/svgs/zai";
import type { ComponentType, SVGProps } from "react";

export const SIMPLE_ENGINE_ICONS: Partial<
  Record<EngineIconKey, ComponentType<SVGProps<SVGSVGElement>>>
> = {
  amazon: Amazon,
  exa: Exa,
  commoncrawl: CommonCrawl,
  youcom: YouCom,
  liner: Liner,
  cline: Cline,
  devin: Devin,
  diffbot: Diffbot,
  tavily: Tavily,
  timpi: Timpi,
  huawei: Huawei,
  kagi: Kagi,
  zai: Zai,
  claude: ClaudeAiIcon,
  "claude-code": ClaudeAiIcon,
  mistral: Mistral,
  deepseek: Deepseek,
  meta: Meta,
  tencent: Tencent,
  xiaomi: Xiaomi,
  cursor: Cursor,
  google: Google,
  duckduckgo: DuckDuckGo,
  cloudflare: Cloudflare,
  mozilla: Firefox,
  cohere: Cohere,
  kimi: Kimi,
};

export const THEMED_ENGINE_ICONS: Partial<
  Record<
    EngineIconKey,
    readonly [
      ComponentType<SVGProps<SVGSVGElement>>,
      ComponentType<SVGProps<SVGSVGElement>>,
    ]
  >
> = {
  openai: [Openai, OpenaiDark],
  codex: [Openai, OpenaiDark],
  grok: [Grok, GrokDark],
  qwen: [Qwen, QwenDark],
  apple: [Apple, AppleDark],
  tiktok: [TikTok, TikTokDark],
  manus: [Manus, ManusDark],
  firecrawl: [Firecrawl, FirecrawlDark],
  opencode: [Opencode, OpencodeDark],
};
