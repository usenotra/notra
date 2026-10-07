"use client";

import type { GeoAnswerMentionTerm } from "@notra/geo-core/types/geo";
import { geoAnswerMentionSpans } from "@notra/geo-core/utils/geo-answer-mentions";
import {
  MessageTableCell,
  MessageTableHeaderCell,
} from "@notra/ui/components/ai-elements/message";
import {
  HoverCard,
  HoverCardTrigger,
} from "@notra/ui/components/ui/hover-card";
import {
  Children,
  createElement,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ComponentType,
  type ReactNode,
  use,
  useState,
} from "react";
import { useTranslations } from "use-intl";

import { GeoAnswerMentionCompetitorCard } from "@/components/geo/geo-answer-mention-card";
import { GeoAnswerMentionContext } from "@/components/geo/geo-answer-mention-context";
import {
  GEO_ANSWER_MENTION_CLASS,
  GEO_ANSWER_MENTION_LIST_ITEM_CLASS,
  GEO_ANSWER_MENTION_TRIGGER_CLASS,
} from "@/constants/geo-answer-mentions";
import { useGeoCompetitorRowNavigation } from "@/lib/hooks/use-geo";
import { cn } from "@/lib/utils";
import type { GeoAnswerMentionMarkProps } from "@/types/geo-answer-mentions";
import { findMentionedCompetitor } from "@/utils/geo-answer-mention-competitor";

const MENTION_HOST_PREFIX = "GeoAnswerMention.";
const SKIP_TAGS = new Set(["code", "pre", "mark", "kbd", "samp", "button"]);

// Set while highlighting so a block knows it names the user's own brand.
type OwnMentionFlag = { found: boolean };

function mentionMarks(
  text: string,
  terms: readonly GeoAnswerMentionTerm[],
  ownMention?: OwnMentionFlag
) {
  const spans = geoAnswerMentionSpans(text, terms);
  if (spans.length === 0) {
    return text;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (ownMention && span.kind === "own") {
      ownMention.found = true;
    }
    if (span.start > cursor) {
      nodes.push(text.slice(cursor, span.start));
    }
    nodes.push(
      <MentionMark
        key={`${span.start}-${span.end}`}
        kind={span.kind}
        phrase={span.phrase}
      >
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

function markdownTagName(node: unknown): string | undefined {
  if (typeof node !== "object" || node === null || !("tagName" in node)) {
    return undefined;
  }
  return typeof node.tagName === "string" ? node.tagName : undefined;
}

function shouldSkipElement(type: unknown, node: unknown): boolean {
  const tagName = markdownTagName(node);
  if (tagName && SKIP_TAGS.has(tagName)) {
    return true;
  }
  if (type === MentionMark || type === CompetitorMentionMark) {
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
  terms: readonly GeoAnswerMentionTerm[],
  ownMention?: OwnMentionFlag
): ReactNode {
  if (terms.length === 0) {
    return children;
  }

  return Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return mentionMarks(String(child), terms, ownMention);
    }
    if (!isValidElement<{ children?: ReactNode; node?: unknown }>(child)) {
      return child;
    }
    if (
      shouldSkipElement(child.type, child.props.node) ||
      child.props.children == null
    ) {
      return child;
    }
    const { children: nested, node: _node, ...rest } = child.props;
    return createElement(
      child.type,
      { ...rest, key: child.key },
      highlightMentionChildren(nested, terms, ownMention)
    );
  });
}

function CompetitorMentionMark({
  phrase,
  children,
}: Omit<GeoAnswerMentionMarkProps, "kind">) {
  const { competitors, organizationId, organizationSlug } = use(
    GeoAnswerMentionContext
  );
  const t = useTranslations("geo.geoAnswerMentionComponents");
  const competitor = findMentionedCompetitor(competitors, phrase);
  const brand = competitor?.name ?? phrase;
  const [open, setOpen] = useState(false);
  const { openRow } = useGeoCompetitorRowNavigation(
    organizationSlug || undefined,
    organizationId
  );

  return (
    <HoverCard onOpenChange={setOpen} open={open}>
      <HoverCardTrigger
        render={
          <button
            aria-label={t("competitorDetails", { brand })}
            className={cn(
              GEO_ANSWER_MENTION_CLASS.competitor,
              GEO_ANSWER_MENTION_TRIGGER_CLASS
            )}
            type="button"
          />
        }
      >
        {children}
      </HoverCardTrigger>
      <GeoAnswerMentionCompetitorCard
        brand={brand}
        domain={competitor?.domain ?? null}
        kind={competitor?.kind ?? null}
        onView={() => openRow(brand)}
        open={open}
        organizationId={organizationId}
        showView={organizationSlug.length > 0}
        synonyms={competitor?.synonyms ?? []}
        tracked={competitor !== undefined}
      />
    </HoverCard>
  );
}

function MentionMark({ kind, phrase, children }: GeoAnswerMentionMarkProps) {
  const tGeoShared = useTranslations("geo.shared");
  if (kind === "competitor") {
    return (
      <CompetitorMentionMark phrase={phrase}>{children}</CompetitorMentionMark>
    );
  }

  return (
    <mark
      className={GEO_ANSWER_MENTION_CLASS[kind]}
      title={
        kind === "own" ? tGeoShared("yourBrand") : tGeoShared("competitor")
      }
    >
      {children}
    </mark>
  );
}

function mentionHost<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  baseClassName?: string
) {
  function MentionHost({
    children,
    className,
    node: _node,
    ...rest
  }: ComponentPropsWithoutRef<Tag> & { node?: unknown }) {
    const { terms } = use(GeoAnswerMentionContext);
    const ownMention: OwnMentionFlag = { found: false };
    const content = highlightMentionChildren(children, terms, ownMention);
    return createElement(
      tag,
      {
        ...rest,
        className: cn(baseClassName, className) || undefined,
        "data-own-mention": ownMention.found || undefined,
      },
      content
    );
  }
  MentionHost.displayName = `${MENTION_HOST_PREFIX}${tag}`;
  return MentionHost;
}

function mentionComponent<Props extends { children?: ReactNode }>(
  Component: ComponentType<Props>,
  name: string
) {
  function MentionHost(props: Props) {
    const { terms } = use(GeoAnswerMentionContext);
    const ownMention: OwnMentionFlag = { found: false };
    const content = highlightMentionChildren(props.children, terms, ownMention);
    return (
      <Component {...props} data-own-mention={ownMention.found || undefined}>
        {content}
      </Component>
    );
  }
  MentionHost.displayName = `${MENTION_HOST_PREFIX}${name}`;
  return MentionHost;
}

export const GeoAnswerMentionParagraph = mentionHost("p");
export const GeoAnswerMentionListItem = mentionHost(
  "li",
  GEO_ANSWER_MENTION_LIST_ITEM_CLASS
);
export const GeoAnswerMentionTableCell = mentionComponent(
  MessageTableCell,
  "td"
);
export const GeoAnswerMentionTableHeaderCell = mentionComponent(
  MessageTableHeaderCell,
  "th"
);
export const GeoAnswerMentionHeading1 = mentionHost("h1");
export const GeoAnswerMentionHeading2 = mentionHost("h2");
export const GeoAnswerMentionHeading3 = mentionHost("h3");
export const GeoAnswerMentionHeading4 = mentionHost("h4");
export const GeoAnswerMentionHeading5 = mentionHost("h5");
export const GeoAnswerMentionHeading6 = mentionHost("h6");
export const GeoAnswerMentionBlockquote = mentionHost("blockquote");
