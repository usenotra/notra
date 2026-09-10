"use client";

import {
  ComputerTerminal01Icon,
  Robot01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
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
import { Gemini } from "@notra/ui/components/ui/svgs/gemini";
import { Google } from "@notra/ui/components/ui/svgs/google";
import { Huawei } from "@notra/ui/components/ui/svgs/huawei";
import { Kagi } from "@notra/ui/components/ui/svgs/kagi";
import { Kimi } from "@notra/ui/components/ui/svgs/kimi";
import { Liner } from "@notra/ui/components/ui/svgs/liner";
import { Manus } from "@notra/ui/components/ui/svgs/manus";
import { ManusDark } from "@notra/ui/components/ui/svgs/manusDark";
import { Meta } from "@notra/ui/components/ui/svgs/meta";
import { MicrosoftCopilot } from "@notra/ui/components/ui/svgs/microsoftCopilot";
import { Mistral } from "@notra/ui/components/ui/svgs/mistral";
import { Openai } from "@notra/ui/components/ui/svgs/openai";
import { OpenaiDark } from "@notra/ui/components/ui/svgs/openaiDark";
import { Opencode } from "@notra/ui/components/ui/svgs/opencode";
import { OpencodeDark } from "@notra/ui/components/ui/svgs/opencodeDark";
import { Perplexity } from "@notra/ui/components/ui/svgs/perplexity";
import { Qwen } from "@notra/ui/components/ui/svgs/qwen";
import { QwenDark } from "@notra/ui/components/ui/svgs/qwenDark";
import { Grok } from "@notra/ui/components/ui/svgs/grok";
import { GrokDark } from "@notra/ui/components/ui/svgs/grokDark";
import { Tavily } from "@notra/ui/components/ui/svgs/tavily";
import { Tencent } from "@notra/ui/components/ui/svgs/tencent";
import { TikTok } from "@notra/ui/components/ui/svgs/tikTok";
import { TikTokDark } from "@notra/ui/components/ui/svgs/tikTokDark";
import { Timpi } from "@notra/ui/components/ui/svgs/timpi";
import { Xiaomi } from "@notra/ui/components/ui/svgs/xiaomi";
import { YouCom } from "@notra/ui/components/ui/svgs/youCom";
import { Zai } from "@notra/ui/components/ui/svgs/zai";
import type { ComponentType, SVGProps } from "react";
import { ModelProviderLogo } from "@notra/ui/components/geo/model-provider-logo";
import { cn } from "@notra/ui/lib/utils";
import type { EngineIconKey, EngineIconProps } from "@notra/ui/types/geo";
import { resolveEngineIconKey } from "@notra/ui/lib/geo-engine-icon";
import { splitModelId } from "@notra/ui/lib/geo-model-display";

export function EngineIcon(props: EngineIconProps) {
  return (
    <span aria-hidden="true" className="contents">
      <EngineIconGraphic {...props} />
    </span>
  );
}

function EngineIconGraphic({ engine, className }: EngineIconProps) {
  const key = resolveEngineIconKey(engine);
  if (!key) {
    const parsed = splitModelId(engine);
    if (!parsed) {
      return null;
    }
    return (
      <ModelProviderLogo className={className} provider={parsed.provider} />
    );
  }

  const iconClass = cn("size-4 shrink-0", className);
  const themed = THEMED_ICONS[key];
  if (themed) {
    return themedIcon(themed[0], themed[1], iconClass);
  }
  const hugeicon = HUGEICON_ICONS[key];
  if (hugeicon) {
    return <HugeiconsIcon className={iconClass} icon={hugeicon} />;
  }
  const Icon = SIMPLE_ICONS[key] ?? MicrosoftCopilot;
  return <Icon className={cn(iconClass, SIMPLE_ICON_CLASSES[key])} />;
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const SIMPLE_ICONS: Partial<Record<EngineIconKey, IconComponent>> = {
  claude: ClaudeAiIcon,
  "claude-code": ClaudeAiIcon,
  gemini: Gemini,
  perplexity: Perplexity,
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
};

const SIMPLE_ICON_CLASSES: Partial<Record<EngineIconKey, string>> = {
  gemini: "overflow-visible",
};

const THEMED_ICONS: Partial<
  Record<EngineIconKey, readonly [IconComponent, IconComponent]>
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

const HUGEICON_ICONS: Partial<Record<EngineIconKey, IconSvgElement>> = {
  agent: Robot01Icon,
  cli: ComputerTerminal01Icon,
};

function themedIcon(Light: IconComponent, Dark: IconComponent, iconClass: string) {
  return (
    <>
      <Light className={cn(iconClass, "block dark:hidden")} />
      <Dark className={cn(iconClass, "hidden dark:block")} />
    </>
  );
}
