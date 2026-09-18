"use client";

import { EyeIcon, SourceCodeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import { ExpandableTabs } from "@notra/ui/components/ui/expandable-tabs";
import { Figma } from "@notra/ui/components/ui/svgs/figma";
import { Paper } from "@notra/ui/components/ui/svgs/paper";
import { useState } from "react";
import { toast } from "sonner";

import HtmlCodeEditor from "@/components/html-to-figma/html-code-editor";
import HtmlPreview from "@/components/html-to-figma/html-preview";
import {
  HTML_EXPORT_COPY,
  HTML_EXPORT_LABEL,
  HTML_EXPORT_PLACEHOLDER,
} from "@/lib/html-to-figma/constants";
import { copyHtmlAsFigma, copyHtmlAsPaper } from "@/lib/html-to-figma/export";
import type {
  HtmlExportTarget,
  HtmlExportToolProps,
} from "@/types/html-to-figma";

const PANEL_CLASS =
  "h-[60svh] max-h-[44rem] min-h-[24rem] w-full overflow-hidden rounded-2xl border border-[#1E1E1E14] bg-background dark:border-white/10";

export default function HtmlExportTool({ target }: HtmlExportToolProps) {
  const [html, setHtml] = useState("");
  const [pendingTarget, setPendingTarget] = useState<HtmlExportTarget | null>(
    null
  );
  const [view, setView] = useState("html");

  const copy = HTML_EXPORT_COPY[target];
  const paperCopy = HTML_EXPORT_COPY.paper;
  const isEmpty = html.trim().length === 0;
  const isPending = pendingTarget !== null;

  const tabs = [
    {
      value: "html",
      label: "HTML",
      icon: <HugeiconsIcon className="size-5" icon={SourceCodeIcon} />,
    },
    {
      value: "preview",
      label: "Preview",
      icon: <HugeiconsIcon className="size-5" icon={EyeIcon} />,
    },
  ];

  async function handleCopy(copyTarget: HtmlExportTarget) {
    if (isPending || isEmpty) {
      return;
    }

    setPendingTarget(copyTarget);

    const result =
      copyTarget === "figma"
        ? await copyHtmlAsFigma(html, HTML_EXPORT_LABEL)
        : await copyHtmlAsPaper(html, HTML_EXPORT_LABEL);

    setPendingTarget(null);

    const messages = HTML_EXPORT_COPY[copyTarget];
    if (result.copied) {
      toast.success(messages.successMessage);
      return;
    }

    toast.error(result.error ?? messages.errorMessage);
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <ExpandableTabs
          items={tabs}
          label="Switch between HTML and preview"
          onValueChange={setView}
          value={view}
        />

        <div className="flex items-center gap-2">
          {target === "figma" ? (
            <Button
              className="border-border gap-2 border bg-white text-neutral-900 shadow-sm hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
              disabled={isEmpty || isPending}
              onClick={() => handleCopy("paper")}
              size="lg"
              type="button"
              variant="outline"
            >
              <Paper className="size-4" />
              {pendingTarget === "paper"
                ? paperCopy.pendingLabel
                : paperCopy.buttonLabel}
            </Button>
          ) : null}
          <Button
            className="border-border gap-2 border bg-white text-neutral-900 shadow-sm hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
            disabled={isEmpty || isPending}
            onClick={() => handleCopy(target)}
            size="lg"
            type="button"
            variant="outline"
          >
            {target === "figma" ? (
              <Figma className="size-4" />
            ) : (
              <Paper className="size-4" />
            )}
            {pendingTarget === target ? copy.pendingLabel : copy.buttonLabel}
          </Button>
        </div>
      </div>

      {view === "preview" ? (
        <div className={PANEL_CLASS}>
          <HtmlPreview html={html} />
        </div>
      ) : (
        <HtmlCodeEditor
          onChange={setHtml}
          placeholder={HTML_EXPORT_PLACEHOLDER}
          value={html}
        />
      )}

      <p className="text-muted-foreground font-mono text-xs">
        Runs in your browser. Nothing is uploaded. Not affiliated with{" "}
        {copy.productName}.
      </p>
    </div>
  );
}
