"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { useHotkey } from "@tanstack/react-hotkeys";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useRef, useState } from "react";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  GEO_SHELF_ADD_HOTKEY,
  GEO_SHELF_SHELF_FILTERS,
  GEO_SHELF_TICKET_FILTERS,
  GEO_SHELF_VIEWS,
} from "@/constants/geo-shelf";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { useGeoSettings } from "@/lib/hooks/use-geo";
import { useGeoActiveProject } from "@/lib/hooks/use-geo-active-project";
import { useGeoCompetitorsDb, useGeoShelfDb } from "@/lib/hooks/use-geo-db";
import { useGeoShelfMembers } from "@/lib/hooks/use-geo-shelf";
import type {
  GeoShelfPageModel,
  GeoShelfRow,
  GeoShelfSelection,
} from "@/types/geo-shelf";
import { resolveOrganizationId } from "@/utils/geo-overview-organization";
import {
  resolveGeoShelfPageStatus,
  toGeoShelfPageModel,
  toGeoShelfReadyFields,
} from "@/utils/geo-shelf-page";

function useGeoShelfViewed(input: {
  isSettingsPending: boolean;
  isShelfLoading: boolean;
  hasSettings: boolean;
  shelfCount: number;
  isSampleData: boolean;
  view: string;
}) {
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current || input.isSettingsPending || input.isShelfLoading) {
      return;
    }
    viewedRef.current = true;
    trackEvent(POSTHOG_EVENTS.GEO_SHELF_VIEWED, {
      view: input.view,
      has_settings: input.hasSettings,
      shelf_count: input.shelfCount,
      is_sample_data: input.isSampleData,
    });
  }, [
    input.hasSettings,
    input.isSampleData,
    input.isSettingsPending,
    input.isShelfLoading,
    input.shelfCount,
    input.view,
  ]);
}

export function useGeoShelfPage(organizationSlug: string): GeoShelfPageModel {
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

  useHotkey(GEO_SHELF_ADD_HOTKEY, () => setAddOpen(true), {
    enabled: !addOpen && selected === null,
  });

  const settings = settingsData?.settings ?? null;
  const hasSettings = settings !== null;

  useGeoShelfViewed({
    isSettingsPending,
    isShelfLoading: shelf.isLoading,
    hasSettings,
    shelfCount: shelf.sources.length,
    isSampleData: shelf.isSampleData,
    view,
  });

  return toGeoShelfPageModel({
    status: resolveGeoShelfPageStatus({
      isSettingsPending,
      hasSettings,
      isShelfLoading: shelf.isLoading,
    }),
    empty: { organizationSlug, projectId },
    ready: toGeoShelfReadyFields({
      organizationId,
      organizationSlug,
      companyName: settings?.companyName,
      ownDomain,
      competitors,
      members: membersQuery.data?.members,
      currentMemberId: membersQuery.data?.currentMemberId,
      sources: shelf.sources,
      selected,
      search,
      shelfFilter,
      ticketFilter,
      view,
      addOpen,
      pendingSourceIds: shelf.pendingSourceIds,
      onSearchChange: setSearch,
      onShelfFilterChange: setShelfFilter,
      onTicketFilterChange: setTicketFilter,
      onViewChange: setView,
      onAddOpenChange: setAddOpen,
      onRowClick: (row: GeoShelfRow) => {
        setSelected({ id: row.id, url: row.url });
      },
      onSelectedOpenChange: (open) => {
        if (!open) {
          setSelected(null);
        }
      },
      addSource: shelf.addSource,
      updateOpportunity: shelf.updateOpportunity,
      setPlacementStatus: shelf.setPlacementStatus,
    }),
  });
}
