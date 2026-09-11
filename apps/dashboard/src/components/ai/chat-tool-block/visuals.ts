import type { ChartArtifact } from "@notra/ai/types/chart-artifact";

import { parseToolOutputChart } from "@/utils/chat-tool-chart";
import { parseCreatePostDraft } from "@/utils/chat-tool-draft";

import type { ToolOutputImage } from "./tool-output-images/types";
import { collectToolOutputImages } from "./tool-output-images/utils";

export interface ChatToolBlockVisuals {
  chart: ChartArtifact | undefined;
  draft: { title: string; markdown: string } | undefined;
  showDraftPreview: boolean;
  hasApprovalActions: boolean;
  showJsonInput: boolean;
  showJsonOutput: boolean;
  showJsonDetails: boolean;
  hasDetails: boolean;
  outputImages: ToolOutputImage[];
}

export function resolveChatToolBlockVisuals({
  toolName,
  input,
  output,
  hasInput,
  hasOutput,
  isError,
  isStreaming,
  isAwaitingApproval,
  editorHref,
  onApprove,
  onDeny,
}: {
  toolName: string;
  input: unknown;
  output: unknown;
  hasInput: boolean;
  hasOutput: boolean;
  isError: boolean;
  isStreaming: boolean;
  isAwaitingApproval: boolean;
  editorHref?: string;
  onApprove?: () => void;
  onDeny?: () => void;
}): ChatToolBlockVisuals {
  const chart =
    hasOutput && !isError ? parseToolOutputChart(output) : undefined;
  const draft = parseCreatePostDraft(input, toolName);
  const showDraftPreview = Boolean(
    draft && (isAwaitingApproval || editorHref || onApprove || onDeny)
  );
  const hasApprovalActions = Boolean(
    isAwaitingApproval && (onApprove || onDeny) && !showDraftPreview
  );
  const showJsonInput = hasInput && !showDraftPreview;
  const showJsonOutput = hasOutput && !chart;
  const showJsonDetails = showJsonInput || showJsonOutput;

  return {
    chart,
    draft,
    showDraftPreview,
    hasApprovalActions,
    showJsonInput,
    showJsonOutput,
    showJsonDetails,
    hasDetails: showJsonDetails || hasApprovalActions,
    outputImages:
      hasOutput && !isError && !isStreaming
        ? collectToolOutputImages(output)
        : [],
  };
}
