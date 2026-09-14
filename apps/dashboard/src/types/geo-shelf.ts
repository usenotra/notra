import type { GeoCompetitor, GeoSettings } from "@notra/geo-core/types/geo";
import type {
  GEO_SHELF_SHELF_FILTERS,
  GEO_SHELF_SORT_DIRECTIONS,
  GEO_SHELF_SORT_KEYS,
  GEO_SHELF_TICKET_FILTERS,
} from "@notra/schemas/constants/dashboard/geo-shelf";
import type {
  geoShelfBoardCountsSchema,
  geoShelfCitationSummarySchema,
  geoShelfCreateInputSchema,
  geoShelfFetchStatusSchema,
  geoShelfListInputSchema,
  geoShelfListResponseSchema,
  geoShelfMemberSchema,
  geoShelfMembersResponseSchema,
  geoShelfMutationResponseSchema,
  geoShelfOpportunitySchema,
  geoShelfPreviewResponseSchema,
  geoShelfOpportunityStatusSchema,
  geoShelfOpportunityWriteSchema,
  geoShelfOriginSchema,
  geoShelfOwnershipSchema,
  geoShelfPlacementSchema,
  geoShelfPlacementStatusSchema,
  geoShelfPlacementWriteSchema,
  geoShelfPrioritySchema,
  geoShelfSourceKindSchema,
  geoShelfSourceSchema,
  geoShelfUpdateInputSchema,
  geoShelfUrlCheckResponseSchema,
} from "@notra/schemas/dashboard/geo-shelf";
import type { z } from "zod";

import type { GEO_SHELF_VIEWS } from "@/constants/geo-shelf";

export type GeoShelfSourceKind = z.infer<typeof geoShelfSourceKindSchema>;
export type GeoShelfOwnership = z.infer<typeof geoShelfOwnershipSchema>;
export type GeoShelfOrigin = z.infer<typeof geoShelfOriginSchema>;
export type GeoShelfFetchStatus = z.infer<typeof geoShelfFetchStatusSchema>;
export type GeoShelfPlacementStatus = z.infer<
  typeof geoShelfPlacementStatusSchema
>;
export type GeoShelfOpportunityStatus = z.infer<
  typeof geoShelfOpportunityStatusSchema
>;
export type GeoShelfPriority = z.infer<typeof geoShelfPrioritySchema>;
export type GeoShelfMember = z.infer<typeof geoShelfMemberSchema>;
export type GeoShelfPlacement = z.infer<typeof geoShelfPlacementSchema>;
export type GeoShelfPlacementWrite = z.infer<
  typeof geoShelfPlacementWriteSchema
>;
export type GeoShelfCitationSummary = z.infer<
  typeof geoShelfCitationSummarySchema
>;

/** One raw URL group from mention-check sources, before canonical merge. */
export interface GeoShelfCitationRawRow {
  url: string;
  title: string | null;
  windowCount: number;
  totalCount: number;
  promptIds: string[];
  engines: string[];
  checkIds: string[];
  windowCheckIds: string[];
  firstCitedAt: Date | string;
  lastCitedAt: Date | string;
}

export interface GeoShelfCitedPage {
  url: string;
  domain: string;
  title: string | null;
  citations: GeoShelfCitationSummary;
}

export type GeoShelfOpportunity = z.infer<typeof geoShelfOpportunitySchema>;
export type GeoShelfOpportunityWrite = z.infer<
  typeof geoShelfOpportunityWriteSchema
>;
export type GeoShelfOpportunityPatch = Partial<GeoShelfOpportunityWrite>;
export type GeoShelfSource = z.infer<typeof geoShelfSourceSchema>;
export type GeoShelfListResponse = z.infer<typeof geoShelfListResponseSchema>;
export type GeoShelfMembersResponse = z.infer<
  typeof geoShelfMembersResponseSchema
>;
export type GeoShelfCreateInput = z.infer<typeof geoShelfCreateInputSchema>;
export type GeoShelfUpdateInput = z.infer<typeof geoShelfUpdateInputSchema>;
export type GeoShelfMutationResponse = z.infer<
  typeof geoShelfMutationResponseSchema
>;
export type GeoShelfPreview = z.infer<typeof geoShelfPreviewResponseSchema>;
export type GeoShelfUrlCheckResponse = z.infer<
  typeof geoShelfUrlCheckResponseSchema
>;

export type GeoShelfShelfFilter = (typeof GEO_SHELF_SHELF_FILTERS)[number];
export type GeoShelfTicketFilter = (typeof GEO_SHELF_TICKET_FILTERS)[number];
export type GeoShelfSortKey = (typeof GEO_SHELF_SORT_KEYS)[number];
export type GeoShelfSortDirection = (typeof GEO_SHELF_SORT_DIRECTIONS)[number];
export type GeoShelfView = (typeof GEO_SHELF_VIEWS)[number];
export type GeoShelfBoardColumnId = GeoShelfOpportunityStatus | "untracked";
export type GeoShelfBoardItems = Record<GeoShelfBoardColumnId, string[]>;
export type GeoShelfBoardCounts = z.infer<typeof geoShelfBoardCountsSchema>;
export type GeoShelfListInput = z.input<typeof geoShelfListInputSchema>;

export interface GeoShelfSortState {
  key: GeoShelfSortKey;
  direction: GeoShelfSortDirection;
}

/** Search resolved against names that only live outside the shelf rows. */
export interface GeoShelfSearchQuery {
  text: string;
  competitorIds: string[];
  memberIds: string[];
}

export interface GeoShelfPageQuery {
  offset: number;
  limit: number;
  shelf: GeoShelfShelfFilter;
  ticket: GeoShelfTicketFilter;
  currentMemberId: string | null;
  search: GeoShelfSearchQuery | null;
  sort: GeoShelfSortState;
}

export interface GeoShelfSourcePage {
  sources: GeoShelfSource[];
  nextOffset: number | null;
  totalCount: number;
  filteredCount: number;
  boardCounts: GeoShelfBoardCounts;
  hasScanData: boolean;
  isSampleData: boolean;
}

export interface GeoShelfCitationState {
  id: string;
  url: string;
  title: string | null;
  citations: unknown;
}

export interface GeoShelfStoreKey {
  organizationId: string;
  projectId: string;
}

export interface GeoShelfFixtureContext {
  ownBrandName: string;
  ownDomain: string | null;
  competitors: GeoCompetitor[];
  engines: string[];
  members: GeoShelfMember[];
  now: Date;
}

export interface GeoShelfStoreSeed {
  settings: GeoSettings;
  ownDomain: string | null;
  competitors: GeoCompetitor[];
  members: GeoShelfMember[];
}

export interface GeoShelfRow extends GeoShelfSource {
  ownPlacement: GeoShelfPlacement | null;
  competitorPlacements: GeoShelfPlacement[];
  presentCompetitors: GeoShelfPlacement[];
  isOpportunity: boolean;
  assignee: GeoShelfMember | null;
  poc: GeoShelfMember | null;
}

export interface GeoShelfFilterState {
  search: string;
  shelf: GeoShelfShelfFilter;
  ticket: GeoShelfTicketFilter;
  currentMemberId: string | null;
}

export interface GeoShelfNewSourceDraft {
  url: string;
  title: string;
  kind: GeoShelfSourceKind;
  ownPresent: boolean;
  presentCompetitorIds: string[];
  opportunity: GeoShelfOpportunityWrite;
}

export interface GeoShelfUpdateResult {
  source: GeoShelfSource;
  assigneeChanged: boolean;
  placementsChanged: boolean;
}

export interface GeoShelfDbApi {
  /** Every loaded page, in server order. */
  sources: GeoShelfSource[];
  isLoading: boolean;
  isSampleData: boolean;
  totalCount: number;
  filteredCount: number;
  boardCounts: GeoShelfBoardCounts;
  hasScanData: boolean;
  hasNextPage: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  loadMore: () => void;
  pendingSourceIds: ReadonlySet<string>;
  addSource: (source: GeoShelfSource) => void;
  updateOpportunity: (
    sourceId: string,
    changes: Partial<GeoShelfOpportunityWrite>
  ) => void;
  setPlacementStatus: (
    sourceId: string,
    competitorId: string | null,
    status: GeoShelfPlacementStatus
  ) => void;
}

export interface GeoShelfToolbarProps {
  filters: GeoShelfFilterState;
  onSearchChange: (value: string) => void;
  onShelfFilterChange: (value: GeoShelfShelfFilter) => void;
  onTicketFilterChange: (value: GeoShelfTicketFilter) => void;
}

export interface GeoShelfViewToggleProps {
  view: GeoShelfView;
  onViewChange: (view: GeoShelfView) => void;
}

export interface GeoShelfPageControlsProps extends GeoShelfToolbarProps {
  hasRows: boolean;
  view: GeoShelfView;
  onViewChange: (view: GeoShelfView) => void;
}

/** Paging state shared by the table and the board. */
export interface GeoShelfPagingProps {
  filteredCount: number;
  hasNextPage: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

export interface GeoShelfBoardProps {
  rows: GeoShelfRow[];
  boardCounts: GeoShelfBoardCounts;
  hasNextPage: boolean;
  isFetching: boolean;
  onLoadMore: () => void;
  ticketFilter: GeoShelfTicketFilter;
  currentMemberId: string | null;
  pendingSourceIds: ReadonlySet<string>;
  onRowClick: (row: GeoShelfRow) => void;
  onUpdateOpportunity: GeoShelfDbApi["updateOpportunity"];
}

export interface GeoShelfViewProps extends GeoShelfPagingProps {
  view: GeoShelfView;
  rows: GeoShelfRow[];
  totalCount: number;
  boardCounts: GeoShelfBoardCounts;
  sort: GeoShelfSortState;
  onSortChange: (sort: GeoShelfSortState) => void;
  ticketFilter: GeoShelfTicketFilter;
  currentMemberId: string | null;
  pendingSourceIds: ReadonlySet<string>;
  hasScanData: boolean;
  onAddShelf: () => void;
  onRowClick: (row: GeoShelfRow) => void;
  onUpdateOpportunity: GeoShelfDbApi["updateOpportunity"];
  onSetPlacementStatus: GeoShelfDbApi["setPlacementStatus"];
}

export interface GeoShelfTableProps extends GeoShelfPagingProps {
  rows: GeoShelfRow[];
  totalCount: number;
  sort: GeoShelfSortState;
  onSortChange: (sort: GeoShelfSortState) => void;
  currentMemberId: string | null;
  onRowClick: (row: GeoShelfRow) => void;
  onUpdateOpportunity: GeoShelfDbApi["updateOpportunity"];
  onSetPlacementStatus: GeoShelfDbApi["setPlacementStatus"];
  pendingSourceIds: ReadonlySet<string>;
  hasScanData: boolean;
  onAddShelf: () => void;
}

export interface GeoShelfTableContextMenuProps {
  row: GeoShelfRow;
  currentMemberId: string | null;
  disabled: boolean;
  onOpenDetails: (row: GeoShelfRow) => void;
  onUpdateOpportunity: GeoShelfDbApi["updateOpportunity"];
  onSetPlacementStatus: GeoShelfDbApi["setPlacementStatus"];
}

export interface GeoShelfPlacementBadgeProps {
  status: GeoShelfPlacementStatus | null;
  evidence?: GeoShelfPlacement["evidence"];
  className?: string;
  /** Table cells explain the status on hover. The detail select already is the control. */
  tooltip?: boolean;
}

export interface GeoShelfPlacementMarkProps {
  status: GeoShelfPlacementStatus | null;
  className?: string;
}

export interface GeoShelfTicketBadgeProps {
  status: GeoShelfOpportunityStatus;
  className?: string;
}

export interface GeoShelfTicketAssigneeCardProps {
  member: GeoShelfMember;
  ticketCreatedAt: string;
  status: GeoShelfOpportunityStatus;
}

export interface GeoShelfMemberAvatarProps {
  member: GeoShelfMember | null;
  className?: string;
  fallbackLabel?: string;
  /** Hide the name — table cells only have room for the mark. */
  showLabel?: boolean;
  size?: "sm" | "md";
}

export interface GeoShelfMemberSelectProps {
  members: GeoShelfMember[];
  value: string | null;
  onChange: (memberId: string | null) => void;
  placeholder?: string;
  allowSameAsAssignee?: boolean;
  disabled?: boolean;
  id?: string;
  ariaLabel: string;
}

export interface GeoShelfDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: GeoShelfRow | null;
  members: GeoShelfMember[];
  currentMemberId: string | null;
  ownBrandName: string;
  onUpdateOpportunity: GeoShelfDbApi["updateOpportunity"];
  onSetPlacementStatus: GeoShelfDbApi["setPlacementStatus"];
  isPending: boolean;
}

export interface GeoShelfTicketFormProps {
  opportunity: GeoShelfOpportunity | null;
  members: GeoShelfMember[];
  currentMemberId: string | null;
  onChange: (changes: Partial<GeoShelfOpportunityWrite>) => void;
  disabled: boolean;
}

export interface GeoShelfDueDateFieldProps {
  id: string;
  dueAt: string | null;
  disabled: boolean;
  onChange: (dueAt: string | null) => void;
}

export interface GeoShelfPresenceFieldsProps {
  id: string;
  ownBrandName: string;
  competitors: GeoCompetitor[];
  ownPresent: boolean;
  presentCompetitorIds: string[];
  onOwnPresentChange: (checked: boolean) => void;
  onPresentCompetitorIdsChange: (competitorIds: string[]) => void;
}

export interface GeoShelfTitleFieldProps {
  id: string;
  value: string;
  errors: readonly unknown[];
  previewTitle: string | null;
  previewError: string | null;
  isPreviewLoading: boolean;
  showPreviewTitle: boolean;
  onBlur: () => void;
  onChange: (value: string) => void;
}

export interface GeoShelfAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  competitors: GeoCompetitor[];
  members: GeoShelfMember[];
  currentMemberId: string | null;
  ownBrandName: string;
  /** Canonical URLs already on the shelf, used to reject duplicates inline. */
  existingUrls: string[];
  onSubmit: (draft: GeoShelfNewSourceDraft) => void;
}

export interface GeoShelfPlacementsTableProps {
  row: GeoShelfRow;
  ownBrandName: string;
  onSetPlacementStatus: GeoShelfDbApi["setPlacementStatus"];
  disabled: boolean;
}

export interface GeoShelfPageStatusInput {
  isSettingsPending: boolean;
  hasSettings: boolean;
  isShelfLoading: boolean;
  isMembersLoading: boolean;
}

export interface GeoShelfPageEmpty {
  status: "empty";
  organizationSlug: string;
  projectId: string | undefined;
}

export interface GeoShelfPageReady {
  status: "ready";
  organizationId: string;
  organizationSlug: string;
  ownBrandName: string;
  ownDomain: string | null;
  competitors: GeoCompetitor[];
  members: GeoShelfMember[];
  currentMemberId: string | null;
  currentMember: GeoShelfMember | null;
  /** Loaded rows, already filtered and sorted by the server. */
  rows: GeoShelfRow[];
  totalCount: number;
  filteredCount: number;
  boardCounts: GeoShelfBoardCounts;
  hasNextPage: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  filters: GeoShelfFilterState;
  sort: GeoShelfSortState;
  view: GeoShelfView;
  hasScanData: boolean;
  selectedRow: GeoShelfRow | null;
  addOpen: boolean;
  pendingSourceIds: ReadonlySet<string>;
  onSearchChange: (value: string) => void;
  onShelfFilterChange: (value: GeoShelfShelfFilter) => void;
  onTicketFilterChange: (value: GeoShelfTicketFilter) => void;
  onSortChange: (sort: GeoShelfSortState) => void;
  onViewChange: (value: GeoShelfView) => void;
  onAddOpenChange: (open: boolean) => void;
  onRowClick: (row: GeoShelfRow) => void;
  onSelectedOpenChange: (open: boolean) => void;
  addSource: GeoShelfDbApi["addSource"];
  updateOpportunity: GeoShelfDbApi["updateOpportunity"];
  setPlacementStatus: GeoShelfDbApi["setPlacementStatus"];
}

export type GeoShelfPageModel =
  | { status: "loading" }
  | GeoShelfPageEmpty
  | GeoShelfPageReady;

export interface GeoShelfLoadedProps {
  page: GeoShelfPageReady;
}

export interface GeoShelfNotSetupProps {
  organizationSlug: string;
  projectId: string | undefined;
}
