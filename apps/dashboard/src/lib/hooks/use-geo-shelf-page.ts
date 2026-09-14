"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  GEO_SHELF_SEARCH_MAX_LENGTH,
  GEO_SHELF_SHELF_FILTERS,
  GEO_SHELF_TICKET_FILTERS,
} from "@notra/schemas/constants/dashboard/geo-shelf";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useRef, useState } from "react";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  GEO_SHELF_ADD_HOTKEY,
  GEO_SHELF_DEFAULT_SORT,
  GEO_SHELF_SEARCH_DEBOUNCE_MS,
  GEO_SHELF_VIEWS,
} from "@/constants/geo-shelf";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { useGeoSettings } from "@/lib/hooks/use-geo";
import { useGeoActiveProject } from "@/lib/hooks/use-geo-active-project";
import { useGeoCompetitorsDb } from "@/lib/hooks/use-geo-db";
import { useGeoShelfMembers } from "@/lib/hooks/use-geo-shelf";
import { useGeoShelfSources } from "@/lib/hooks/use-geo-shelf-sources";
import type {
  GeoShelfDbApi,
  GeoShelfPageModel,
  GeoShelfRow,
  GeoShelfSortState,
  GeoShelfSource,
} from "@/types/geo-shelf";
import { resolveOrganizationId } from "@/utils/geo-overview-organization";
import {
  applyShelfOpportunityChanges,
  applyShelfPlacementStatus,
} from "@/utils/geo-shelf";
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
  const [sort, setSort] = useState<GeoShelfSortState>(GEO_SHELF_DEFAULT_SORT);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<GeoShelfSource | null>(null);
  const [debouncedSearch] = useDebouncedValue(search, {
    wait: GEO_SHELF_SEARCH_DEBOUNCE_MS,
  });

  const settings = settingsData?.settings ?? null;
  const hasSettings = settings !== null;
  const shelf = useGeoShelfSources(organizationId, {
    enabled: hasSettings,
    currentMemberId: membersQuery.data?.currentMemberId ?? null,
    filters: {
      // A URL-restored search can exceed what the list endpoint accepts.
      search: debouncedSearch.slice(0, GEO_SHELF_SEARCH_MAX_LENGTH),
      shelf: shelfFilter,
      ticket: ticketFilter,
    },
    sort,
  });

  useHotkey(GEO_SHELF_ADD_HOTKEY, () => setAddOpen(true), {
    enabled: !addOpen && selected === null,
  });

  useGeoShelfViewed({
    isSettingsPending,
    isShelfLoading: hasSettings && shelf.isLoading,
    hasSettings,
    shelfCount: shelf.totalCount,
    isSampleData: shelf.isSampleData,
    view,
  });

  // The open dialog edits its snapshot too, so it stays current after the
  // edit moves the row out of the filtered pages.
  const updateOpportunity: GeoShelfDbApi["updateOpportunity"] = (
    sourceId,
    changes
  ) => {
    const nowIso = new Date().toISOString();
    setSelected((current) =>
      current?.id === sourceId
        ? applyShelfOpportunityChanges(current, changes, nowIso)
        : current
    );
    shelf.updateOpportunity(sourceId, changes);
  };
  const setPlacementStatus: GeoShelfDbApi["setPlacementStatus"] = (
    sourceId,
    competitorId,
    status
  ) => {
    const nowIso = new Date().toISOString();
    setSelected((current) =>
      current?.id === sourceId
        ? applyShelfPlacementStatus(current, competitorId, status, nowIso)
        : current
    );
    shelf.setPlacementStatus(sourceId, competitorId, status);
  };

  return toGeoShelfPageModel({
    status: resolveGeoShelfPageStatus({
      isSettingsPending,
      hasSettings,
      isShelfLoading: shelf.isLoading,
      isMembersLoading: membersQuery.isPending,
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
      shelf,
      selected,
      search,
      shelfFilter,
      ticketFilter,
      sort,
      view,
      addOpen,
      onSearchChange: setSearch,
      onShelfFilterChange: setShelfFilter,
      onTicketFilterChange: setTicketFilter,
      onSortChange: setSort,
      onViewChange: setView,
      onAddOpenChange: setAddOpen,
      onRowClick: (row: GeoShelfRow) => {
        setSelected(row);
      },
      onSelectedOpenChange: (open) => {
        if (!open) {
          setSelected(null);
        }
      },
      updateOpportunity,
      setPlacementStatus,
    }),
  });
}
