"use client";

import type {
  GeoAnswerMentionKind,
  GeoAnswerMentionTerm,
} from "@notra/geo-core/types/geo";
import { geoAnswerMentionSpans } from "@notra/geo-core/utils/geo-answer-mentions";
import {
  Children,
  createContext,
  createElement,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactNode,
  use,
} from "react";

import {
  GEO_ANSWER_MENTION_CLASS,
  GEO_ANSWER_MENTION_LABEL,
} from "@/constants/geo-answer-mentions";

const EMPTY_MENTION_TERMS: readonly GeoAnswerMentionTerm[] = [];
const MENTION_HOST_PREFIX = "GeoAnswerMention.";
const SKIP_TAGS = new Set(["code", "pre", "mark", "kbd", "samp"]);

const GeoAnswerMentionContext =
  createContext<readonly GeoAnswerMentionTerm[]>(EMPTY_MENTION_TERMS);

function mentionMarks(text: string, terms: readonly GeoAnswerMentionTerm[]) {
  const spans = geoAnswerMentionSpans(text, terms);
  if (spans.length === 0) {
    return text;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) {
      nodes.push(text.slice(cursor, span.start));
    }
    nodes.push(
      <MentionMark key={`${span.start}-${span.end}`} kind={span.kind}>
        {text.slice(span.start, span.end)}
      </MentionMark>
    );
    cursor = span.end;
  }
  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return nodes;
}

function shouldSkipElement(type: unknown): boolean {
  if (type === MentionMark) {
    return true;
  }
  if (typeof type === "string") {
    return SKIP_TAGS.has(type);
  }
  return (
    typeof type === "function" &&
    "displayName" in type &&
    String((type as { displayName?: string }).displayName ?? "").startsWith(
      MENTION_HOST_PREFIX
    )
  );
}

function highlightMentionChildren(
  children: ReactNode,
  terms: readonly GeoAnswerMentionTerm[]
): ReactNode {
  if (terms.length === 0) {
    return children;
  }

  return Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return mentionMarks(String(child), terms);
    }
    if (!isValidElement<{ children?: ReactNode }>(child)) {
      return child;
    }
    if (shouldSkipElement(child.type) || child.props.children == null) {
      return child;
    }
    const { children: nested, ...rest } = child.props;
    return createElement(
      child.type,
      { ...rest, key: child.key },
      highlightMentionChildren(nested, terms)
    );
  });
}

function MentionMark({
  kind,
  children,
}: {
  kind: GeoAnswerMentionKind;
  children: ReactNode;
}) {
  return (
    <mark
      className={GEO_ANSWER_MENTION_CLASS[kind]}
      title={GEO_ANSWER_MENTION_LABEL[kind]}
    >
      {children}
    </mark>
  );
}

function mentionHost<Tag extends keyof HTMLElementTagNameMap>(tag: Tag) {
  function MentionHost(props: ComponentPropsWithoutRef<Tag>) {
    const terms = use(GeoAnswerMentionContext);
    const { children, ...rest } = props;
    return createElement(tag, rest, highlightMentionChildren(children, terms));
  }
  MentionHost.displayName = `${MENTION_HOST_PREFIX}${tag}`;
  return MentionHost;
}

export const GEO_ANSWER_MENTION_COMPONENTS = {
  p: mentionHost("p"),
  li: mentionHost("li"),
  td: mentionHost("td"),
  th: mentionHost("th"),
  h1: mentionHost("h1"),
  h2: mentionHost("h2"),
  h3: mentionHost("h3"),
  blockquote: mentionHost("blockquote"),
};

export function GeoAnswerMentionProvider({
  terms,
  children,
}: {
  terms: readonly GeoAnswerMentionTerm[];
  children: ReactNode;
}) {
  return (
    <GeoAnswerMentionContext value={terms}>{children}</GeoAnswerMentionContext>
  );
}
