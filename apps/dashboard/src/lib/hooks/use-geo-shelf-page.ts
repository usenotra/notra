"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useRef, useState } from "react";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  GEO_SHELF_SHELF_FILTERS,
  GEO_SHELF_TICKET_FILTERS,
  GEO_SHELF_VIEWS,
} from "@/constants/geo-shelf";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { useGeoSettings } from "@/lib/hooks/use-geo";
import { useGeoActiveProject } from "@/lib/hooks/use-geo-active-project";
import { useGeoCompetitorsDb, useGeoShelfDb } from "@/lib/hooks/use-geo-db";
import { useGeoShelfMembers } from "@/lib/hooks/use-geo-shelf";
import type { GeoShelfSelection } from "@/types/geo-shelf";
import { resolveOrganizationId } from "@/utils/geo-overview-organization";
import { filterShelfRows, toShelfRows } from "@/utils/geo-shelf";

export function useGeoShelfPage(organizationSlug: string) {
  const { projectId } = useGeoProjectScope();
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const organizationId = resolveOrganizationId(
    organizationSlug,
    activeOrganization,
    getOrganization(organizationSlug)
  );

  const { data: settingsData, isPending: isSettingsPending } =
    useGeoSettings(organizationId);
  const { competitors } = useGeoCompetitorsDb(organizationId);
  const { domain: ownDomain } = useGeoActiveProject(organizationId);
  const membersQuery = useGeoShelfMembers(organizationId);
  const shelf = useGeoShelfDb(organizationId);

  const [search, setSearch] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ clearOnDefault: true })
  );
  const [shelfFilter, setShelfFilter] = useQueryState(
    "shelf",
    parseAsStringLiteral(GEO_SHELF_SHELF_FILTERS)
      .withDefault("all")
      .withOptions({ clearOnDefault: true })
  );
  const [ticketFilter, setTicketFilter] = useQueryState(
    "ticket",
    parseAsStringLiteral(GEO_SHELF_TICKET_FILTERS)
      .withDefault("any")
      .withOptions({ clearOnDefault: true })
  );
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(GEO_SHELF_VIEWS)
      .withDefault("table")
      .withOptions({ clearOnDefault: true })
  );
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<GeoShelfSelection | null>(null);

  const settings = settingsData?.settings ?? null;
  const hasSettings = settings !== null;
  const shelfCount = shelf.sources.length;
  const { isSampleData } = shelf;
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current || isSettingsPending || shelf.isLoading) {
      return;
    }
    viewedRef.current = true;
    trackEvent(POSTHOG_EVENTS.GEO_SHELF_VIEWED, {
      view,
      has_settings: hasSettings,
      shelf_count: shelfCount,
      is_sample_data: isSampleData,
    });
  }, [
    isSettingsPending,
    shelf.isLoading,
    hasSettings,
    shelfCount,
    isSampleData,
    view,
  ]);

  const members = membersQuery.data?.members ?? [];
  const currentMemberId = membersQuery.data?.currentMemberId ?? null;
  const currentMember =
    members.find((member) => member.id === currentMemberId) ?? null;
  const rows = hasSettings ? toShelfRows(shelf.sources, members) : [];
  const filters = {
    search,
    shelf: shelfFilter,
    ticket: ticketFilter,
    currentMemberId,
  };
  const filteredRows = filterShelfRows(rows, filters);
  const selectedRow =
    rows.find((row) => row.id === selected?.id) ??
    rows.find((row) => row.url === selected?.url) ??
    null;

  if (isSettingsPending || (hasSettings && shelf.isLoading)) {
    return { status: "loading" as const };
  }

  if (!settings) {
    return {
      status: "setup" as const,
      organizationSlug,
      projectId,
    };
  }

  return {
    status: "ready" as const,
    organizationId,
    organizationSlug,
    projectId,
    settings,
    competitors,
    ownDomain,
    members,
    currentMemberId,
    currentMember,
    ownBrandName: settings.companyName,
    shelf,
    rows,
    filteredRows,
    filters,
    selectedRow,
    view,
    ticketFilter,
    addOpen,
    setAddOpen,
    setSelected,
    setSearch,
    setShelfFilter,
    setTicketFilter,
    setView,
    openRow: (row: (typeof rows)[number]) =>
      setSelected({ id: row.id, url: row.url }),
  };
}
