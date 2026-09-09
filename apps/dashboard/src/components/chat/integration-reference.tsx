import type { ContextItem } from "@notra/ai/types/chat";
import { Fragment, type ReactNode } from "react";

import { McpIcon } from "@/components/integrations/mcp-icon";
import { INTEGRATION_REFERENCE_TOKEN_SPLIT_REGEX } from "@/constants/integration-reference";
import type { McpIconUrls } from "@/types/integrations/mcp";
import {
  getIntegrationReferenceValue,
  getReferenceDisplay,
  parseReferenceValue,
} from "@/utils/integration-reference";

const REFERENCE_ATTR = "data-integration-reference";

const REFERENCE_CONTAINER_CLASS =
  "chat-integration-reference inline-flex cursor-text select-text items-center gap-[0.48em] whitespace-nowrap rounded-md border border-dashed border-foreground/30 bg-background px-[0.68em] py-[0.28em] align-middle text-[0.88em] text-foreground leading-[1.15]";

const REFERENCE_LABEL_CLASS =
  "inline-flex items-center font-normal tracking-[-0.01em] text-foreground leading-none";

const REFERENCE_GITHUB_ICON_WRAPPER_CLASS =
  "inline-flex size-[1.08em] shrink-0 items-center justify-center text-foreground";

const REFERENCE_LINEAR_ICON_WRAPPER_CLASS =
  "inline-flex size-[1.04em] shrink-0 items-center justify-center text-indigo-500 dark:text-indigo-400";

const REFERENCE_MCP_ICON_WRAPPER_CLASS =
  "inline-flex size-[1.04em] shrink-0 items-center justify-center text-violet-600 dark:text-violet-400";

type ReferenceKind = "github" | "linear" | "mcp";

// Pre-rendered markup for <Github />, <Linear /> and the Hugeicons <CpuIcon />.
// Kept as strings so the chat bundle does not have to ship `react-dom/server`.
const GITHUB_ICON_MARKUP = `<svg class="size-full" fill="none" viewBox="0 0 1024 1024"><title>GitHub</title><path class="fill-foreground dark:fill-white" clip-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z" fill-rule="evenodd" transform="scale(64)"></path></svg>`;
const LINEAR_ICON_MARKUP = `<svg class="size-full" fill="none" viewBox="0 0 100 100"><title>Linear</title><path d="M1.225 61.523c-.222-.949.908-1.546 1.597-.857l36.512 36.512c.69.69.092 1.82-.857 1.597-18.425-4.323-32.93-18.827-37.252-37.252ZM.002 46.889a.99.99 0 0 0 .29.76L52.35 99.71c.201.2.478.307.76.29 2.37-.149 4.695-.46 6.963-.927.765-.157 1.03-1.096.478-1.648L2.576 39.448c-.552-.551-1.491-.286-1.648.479a50.067 50.067 0 0 0-.926 6.962ZM4.21 29.705a.988.988 0 0 0 .208 1.1l64.776 64.776c.289.29.726.375 1.1.208a49.908 49.908 0 0 0 5.185-2.684.981.981 0 0 0 .183-1.54L8.436 24.336a.981.981 0 0 0-1.541.183 49.896 49.896 0 0 0-2.684 5.185Zm8.448-11.631a.986.986 0 0 1-.045-1.354C21.78 6.46 35.111 0 49.952 0 77.592 0 100 22.407 100 50.048c0 14.84-6.46 28.172-16.72 37.338a.986.986 0 0 1-1.354-.045L12.659 18.074Z" fill="#5E6AD2"></path></svg>`;
const MCP_ICON_MARKUP = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" color="currentColor" class="size-full"><path d="M4 12C4 8.22876 4 6.34315 5.17157 5.17157C6.34315 4 8.22876 4 12 4C15.7712 4 17.6569 4 18.8284 5.17157C20 6.34315 20 8.22876 20 12C20 15.7712 20 17.6569 18.8284 18.8284C17.6569 20 15.7712 20 12 20C8.22876 20 6.34315 20 5.17157 18.8284C4 17.6569 4 15.7712 4 12Z" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5"></path><path d="M9.5 2V4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><path d="M14.5 2V4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><path d="M9.5 20V22" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><path d="M14.5 20V22" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><path d="M13 9L9 13" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><path d="M15 13L13 15" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><path d="M22 14.5L20 14.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><path d="M4 9.5L2 9.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><path d="M4 14.5L2 14.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path><path d="M22 9.5L20 9.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path></svg>`;

function getReferenceKind(item: ContextItem): ReferenceKind {
  if (item.type === "github-repo") {
    return "github";
  }
  return item.type === "linear-team" ? "linear" : "mcp";
}

function getReferenceIconWrapperClass(kind: ReferenceKind): string {
  if (kind === "github") {
    return REFERENCE_GITHUB_ICON_WRAPPER_CLASS;
  }
  return kind === "linear"
    ? REFERENCE_LINEAR_ICON_WRAPPER_CLASS
    : REFERENCE_MCP_ICON_WRAPPER_CLASS;
}

function getReferenceIconMarkup(kind: ReferenceKind): string {
  if (kind === "github") {
    return GITHUB_ICON_MARKUP;
  }
  return kind === "linear" ? LINEAR_ICON_MARKUP : MCP_ICON_MARKUP;
}

function ReferenceIcon({
  kind,
  mcpIcon,
}: {
  kind: ReferenceKind;
  mcpIcon?: McpIconUrls;
}) {
  const iconWrapperClass = getReferenceIconWrapperClass(kind);

  if (kind === "mcp" && (mcpIcon?.lightUrl || mcpIcon?.darkUrl)) {
    return (
      <span aria-hidden="true" className={iconWrapperClass}>
        <McpIcon
          className="size-full"
          darkUrl={mcpIcon.darkUrl}
          lightUrl={mcpIcon.lightUrl}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={iconWrapperClass}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: static inline svg markup for editor reference chips.
      dangerouslySetInnerHTML={{ __html: getReferenceIconMarkup(kind) }}
    />
  );
}

export function renderTextWithIntegrationReferences(
  text: string,
  mcpIconsByIntegrationId?: ReadonlyMap<string, McpIconUrls>
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let keySeed = 0;
  const segments = text.split(INTEGRATION_REFERENCE_TOKEN_SPLIT_REGEX);

  segments.forEach((segment, segmentIndex) => {
    if (!segment) {
      return;
    }

    const referenceItem = parseReferenceValue(segment);
    if (referenceItem) {
      const mcpIcon =
        referenceItem.type === "mcp-server"
          ? mcpIconsByIntegrationId?.get(referenceItem.integrationId)
          : undefined;
      nodes.push(
        <IntegrationReference
          display={getReferenceDisplay(referenceItem)}
          key={`ref-${segment}-${keySeed++}`}
          kind={getReferenceKind(referenceItem)}
          mcpIcon={mcpIcon}
          value={getIntegrationReferenceValue(referenceItem)}
        />
      );
      return;
    }

    const lines = segment.split("\n");
    lines.forEach((line, lineIndex) => {
      if (line) {
        nodes.push(
          <Fragment key={`text-${line}-${keySeed++}`}>{line}</Fragment>
        );
      }

      if (lineIndex < lines.length - 1) {
        nodes.push(<br key={`br-${segmentIndex}-${keySeed++}`} />);
      }
    });
  });

  return nodes;
}

export function serializeEditorWithReferences(editor: HTMLElement): string {
  return serializeNodesWithReferences(Array.from(editor.childNodes));
}

export function serializeFragmentWithReferences(
  fragment: DocumentFragment
): string {
  return serializeNodesWithReferences(Array.from(fragment.childNodes));
}

function serializeNodesWithReferences(nodes: Node[]): string {
  let out = "";
  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const el = node as HTMLElement;
    if (el.hasAttribute(REFERENCE_ATTR)) {
      out += el.dataset.value ?? el.textContent ?? "";
      return;
    }
    if (el.tagName === "BR") {
      out += "\n";
      return;
    }
    for (const child of Array.from(el.childNodes)) {
      walk(child);
    }
  };
  for (const child of nodes) {
    walk(child);
  }
  return out.replace(/\u00A0/g, " ");
}

interface IntegrationReferenceProps {
  value: string;
  display: string;
  kind: ReferenceKind;
  mcpIcon?: McpIconUrls;
}

function IntegrationReference({
  value,
  display,
  kind,
  mcpIcon,
}: IntegrationReferenceProps) {
  return (
    <span
      className={REFERENCE_CONTAINER_CLASS}
      contentEditable={false}
      data-integration-reference="true"
      data-value={value}
    >
      <ReferenceIcon kind={kind} mcpIcon={mcpIcon} />
      <span className={REFERENCE_LABEL_CLASS}>{display}</span>
    </span>
  );
}
