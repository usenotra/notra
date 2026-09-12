"use client";

import { GeoAnswerMentionContext } from "@/components/geo/geo-answer-mention-context";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import type {
  GeoAnswerMentionContextValue,
  GeoAnswerMentionProviderProps,
} from "@/types/geo-answer-mentions";

const EMPTY_MENTION_COMPETITORS: GeoAnswerMentionContextValue["competitors"] =
  [];

export function GeoAnswerMentionProvider({
  terms,
  competitors = EMPTY_MENTION_COMPETITORS,
  organizationId = "",
  organizationSlug,
  children,
}: GeoAnswerMentionProviderProps) {
  const { activeOrganization } = useOrganizationsContext();
  const resolvedSlug = organizationSlug ?? activeOrganization?.slug ?? "";

  return (
    <GeoAnswerMentionContext
      value={{
        terms,
        competitors,
        organizationId,
        organizationSlug: resolvedSlug,
      }}
    >
      {children}
    </GeoAnswerMentionContext>
  );
}
