import { cn } from "cn";

import { Card } from "@/components/ui/card";

import {
  CODEX_DEFAULT_CWD,
  CODEX_DEFAULT_MODEL,
  CODEX_DEFAULT_VERSION,
} from "../constants/codex";
import type { CodexHeaderProps } from "../types/codex";

export const CodexHeader = ({
  className,
  cwd = CODEX_DEFAULT_CWD,
  model = CODEX_DEFAULT_MODEL,
  version = CODEX_DEFAULT_VERSION,
  ...props
}: CodexHeaderProps) => (
  <Card
    className={cn(
      "border-codex-rule font-codex text-codex-fg w-fit max-w-full min-w-0 gap-0 rounded-md border bg-transparent px-[1ch] py-[0.325rem] text-[0.8125rem] leading-[1.3] ring-0",
      className
    )}
    data-slot="codex-header"
    {...props}
  >
    <p className="wrap-break-word">
      <span className="text-codex-dim">&gt;_ </span>
      <span className="font-bold">OpenAI Codex</span>
      <span className="text-codex-dim"> (v{version})</span>
    </p>
    <p aria-hidden="true">&nbsp;</p>
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-[1ch]">
      <dt className="text-codex-dim">model:</dt>
      <dd className="wrap-break-word">
        {model}
        <span className="text-codex-dim">{"   "}/model to change</span>
      </dd>
      <dt className="text-codex-dim">directory:</dt>
      <dd className="wrap-break-word">{cwd}</dd>
    </dl>
  </Card>
);
