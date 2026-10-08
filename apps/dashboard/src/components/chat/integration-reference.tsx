import { CpuIcon, File02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ContextItem } from "@notra/ai/types/chat";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { Linear } from "@notra/ui/components/ui/svgs/linear";
import { Fragment, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { McpIcon } from "@/components/integrations/mcp-icon";
import { CHAT_REFERENCE_TOKEN_SPLIT_REGEX } from "@/constants/chat-posts";
import type { McpIconUrls } from "@/types/integrations/mcp";
import {
  getPostReferenceValue,
  parsePostReferenceValue,
} from "@/utils/chat-posts";
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

const REFERENCE_POST_ICON_WRAPPER_CLASS =
  "inline-flex size-[1.04em] shrink-0 items-center justify-center text-muted-foreground";

type ReferenceKind = "github" | "linear" | "mcp" | "post";

const GITHUB_ICON_MARKUP = renderToStaticMarkup(
  <Github className="size-full" />
);
const LINEAR_ICON_MARKUP = renderToStaticMarkup(
  <Linear className="size-full" />
);
const MCP_ICON_MARKUP = renderToStaticMarkup(
  <HugeiconsIcon className="size-full" icon={CpuIcon} />
);
const POST_ICON_MARKUP = renderToStaticMarkup(
  <HugeiconsIcon className="size-full" icon={File02Icon} />
);

function getReferenceKind(item: ContextItem): ReferenceKind {
  if (item.type === "github-repo") {
    return "github";
  }
  return item.type === "linear-team" ? "linear" : "mcp";
}

function getReferenceIconWrapperClass(kind: ReferenceKind): string {
  if (kind === "post") {
    return REFERENCE_POST_ICON_WRAPPER_CLASS;
  }
  if (kind === "github") {
    return REFERENCE_GITHUB_ICON_WRAPPER_CLASS;
  }
  return kind === "linear"
    ? REFERENCE_LINEAR_ICON_WRAPPER_CLASS
    : REFERENCE_MCP_ICON_WRAPPER_CLASS;
}

function getReferenceIconMarkup(kind: ReferenceKind): string {
  if (kind === "post") {
    return POST_ICON_MARKUP;
  }
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
  mcpIconsByIntegrationId?: ReadonlyMap<string, McpIconUrls>,
  postTitlesById?: ReadonlyMap<string, string>
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let keySeed = 0;
  const segments = text.split(CHAT_REFERENCE_TOKEN_SPLIT_REGEX);

  segments.forEach((segment, segmentIndex) => {
    if (!segment) {
      return;
    }

    const postId = parsePostReferenceValue(segment);
    if (postId) {
      nodes.push(
        <IntegrationReference
          display={postTitlesById?.get(postId) ?? segment}
          key={`ref-${segment}-${keySeed++}`}
          kind="post"
          value={getPostReferenceValue(postId)}
        />
      );
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

/**
 * Builds the same non-editable chip the message bubble renders, for inserting
 * into the composer. It serializes to `@post/<id>` through `data-value`.
 */
export function createPostReferenceElement(post: {
  postId: string;
  title: string;
}): HTMLSpanElement {
  const chip = document.createElement("span");
  chip.className = REFERENCE_CONTAINER_CLASS;
  chip.contentEditable = "false";
  chip.setAttribute(REFERENCE_ATTR, "true");
  chip.dataset.value = getPostReferenceValue(post.postId);

  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.className = REFERENCE_POST_ICON_WRAPPER_CLASS;
  icon.innerHTML = POST_ICON_MARKUP;

  const label = document.createElement("span");
  label.className = REFERENCE_LABEL_CLASS;
  label.textContent = post.title;

  chip.append(icon, label);
  return chip;
}

/**
 * Fills the composer from serialized text, turning `@post/<id>` tokens back
 * into chips. Unknown posts keep the generic label.
 */
export function setEditorTextWithPostReferences(
  editor: HTMLElement,
  text: string,
  postTitlesById: ReadonlyMap<string, string>,
  fallbackTitle: string
) {
  editor.replaceChildren();
  for (const segment of text.split(CHAT_REFERENCE_TOKEN_SPLIT_REGEX)) {
    if (!segment) {
      continue;
    }
    const postId = parsePostReferenceValue(segment);
    editor.append(
      postId
        ? createPostReferenceElement({
            postId,
            title: postTitlesById.get(postId) ?? fallbackTitle,
          })
        : document.createTextNode(segment)
    );
  }
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
