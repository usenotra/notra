"use client";

import type {
  GeoAnswerMentionKind,
  GeoAnswerMentionTerm,
} from "@notra/geo-core/types/geo";
import { geoAnswerMentionSpans } from "@notra/geo-core/utils/geo-answer-mentions";
import {
  HoverCard,
  HoverCardTrigger,
} from "@notra/ui/components/ui/hover-card";
import {
  Children,
  createContext,
  createElement,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactNode,
  use,
  useMemo,
  useState,
} from "react";

import { GeoAnswerMentionCompetitorCard } from "@/components/geo/geo-answer-mention-card";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  GEO_ANSWER_MENTION_CLASS,
  GEO_ANSWER_MENTION_LABEL,
  GEO_ANSWER_MENTION_TRIGGER_CLASS,
} from "@/constants/geo-answer-mentions";
import { GEO_TRAFFIC_HOVER_DELAY_MS } from "@/constants/geo-traffic-hover";
import { useGeoCompetitorRowNavigation } from "@/lib/hooks/use-geo";
import { cn } from "@/lib/utils";
import type {
  GeoAnswerMentionContextValue,
  GeoAnswerMentionProviderProps,
} from "@/types/geo-answer-mentions";
import { findMentionedCompetitor } from "@/utils/geo-answer-mention-competitor";

const EMPTY_MENTION_TERMS: readonly GeoAnswerMentionTerm[] = [];
const EMPTY_COMPETITORS: GeoAnswerMentionContextValue["competitors"] = [];
const MENTION_HOST_PREFIX = "GeoAnswerMention.";
const SKIP_TAGS = new Set(["code", "pre", "mark", "kbd", "samp", "button"]);

const EMPTY_MENTION_CONTEXT: GeoAnswerMentionContextValue = {
  terms: EMPTY_MENTION_TERMS,
  competitors: EMPTY_COMPETITORS,
  organizationId: "",
  organizationSlug: "",
};

const GeoAnswerMentionContext = createContext<GeoAnswerMentionContextValue>(
  EMPTY_MENTION_CONTEXT
);

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

function shouldSkipElement(type: unknown): boolean {
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

function CompetitorMentionMark({
  phrase,
  children,
}: {
  phrase: string;
  children: ReactNode;
}) {
  const { competitors, organizationId, organizationSlug } = use(
    GeoAnswerMentionContext
  );
  const competitor = findMentionedCompetitor(competitors, phrase);
  const brand = competitor?.name ?? phrase;
  const [open, setOpen] = useState(false);
  const { openRow, prefetchRow } = useGeoCompetitorRowNavigation(
    organizationSlug || undefined,
    organizationId
  );

  return (
    <HoverCard
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          prefetchRow(brand);
        }
      }}
      open={open}
    >
      <HoverCardTrigger
        delay={GEO_TRAFFIC_HOVER_DELAY_MS}
        render={
          <button
            aria-label={`${brand}, ${GEO_ANSWER_MENTION_LABEL.competitor} details`}
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

function MentionMark({
  kind,
  phrase,
  children,
}: {
  kind: GeoAnswerMentionKind;
  phrase: string;
  children: ReactNode;
}) {
  if (kind === "competitor") {
    return (
      <CompetitorMentionMark phrase={phrase}>{children}</CompetitorMentionMark>
    );
  }

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
    const { terms } = use(GeoAnswerMentionContext);
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
  competitors = EMPTY_COMPETITORS,
  organizationId = "",
  organizationSlug,
  children,
}: GeoAnswerMentionProviderProps) {
  const { activeOrganization } = useOrganizationsContext();
  const resolvedSlug = organizationSlug ?? activeOrganization?.slug ?? "";
  const value = useMemo(
    () => ({
      terms,
      competitors,
      organizationId,
      organizationSlug: resolvedSlug,
    }),
    [competitors, organizationId, resolvedSlug, terms]
  );

  return (
    <GeoAnswerMentionContext value={value}>{children}</GeoAnswerMentionContext>
  );
}
