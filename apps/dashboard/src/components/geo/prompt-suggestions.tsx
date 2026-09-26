"use client";

import { Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@notra/ui/components/shared/responsive-alert-dialog";
import { type RefObject, useRef, useState } from "react";

import { Button } from "@/components/button";
import { PromptSuggestionSheet } from "@/components/geo/prompt-suggestion-sheet";
import { SearchConsoleToolbar } from "@/components/geo/search-console-card";
import { StatusSpinner } from "@/components/geo/status-spinner";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import {
  useGeoSuggestionAccept,
  useGeoSuggestionDismiss,
  useGeoSuggestions,
  useGscAnalyzing,
  useGscCardDismissal,
  useGscStatus,
} from "@/lib/hooks/use-geo";
import { useGscConnectionToast } from "@/lib/hooks/use-gsc-connection-toast";
import type {
  DismissSuggestionDialogProps,
  PromptSuggestionsProps,
  PromptSuggestionsToolbarProps,
  SuggestionColumnsOptions,
  SuggestionRowActionsProps,
} from "@/types/components/geo";
import type { GeoPromptSuggestion } from "@/types/geo";
import { formatCount } from "@/utils/format";
import { suggestionKeywordTotals } from "@/utils/geo-prompt-suggestions";
import { tableHeightFor } from "@/utils/table";

function SuggestionRowActions({
  accepting,
  disabled,
  dismissing,
  onAccept,
  onDismiss,
  suggestion,
}: SuggestionRowActionsProps) {
  return (
    <div className="flex h-full shrink-0 items-center justify-end gap-1">
      <Button
        disabled={disabled}
        onClick={onAccept}
        size="sm"
        variant="secondary"
      >
        {accepting ? (
          <StatusSpinner />
        ) : (
          <HugeiconsIcon icon={PlusSignIcon} size={14} />
        )}
        {accepting ? "Adding…" : "Track"}
      </Button>
      <Button
        aria-label={`Remove ${suggestion.prompt}`}
        disabled={disabled}
        className="text-muted-foreground"
        onClick={onDismiss}
        size="icon-sm"
        variant="ghost"
      >
        {dismissing ? (
          <StatusSpinner />
        ) : (
          <HugeiconsIcon icon={Delete02Icon} size={14} />
        )}
      </Button>
    </div>
  );
}

/**
 * Per-row pending state for a suggestion mutation. Accept and dismiss share
 * one in-flight map so "Track all" can wait for both and a row can never fire
 * twice. `isBlocked` is a getter, not a boolean: "Track all" flips its ref
 * synchronously, before React re-renders these closures.
 */
function useSuggestionRowAction(
  mutateAsync: (input: { suggestionId: string }) => Promise<unknown>,
  pendingRequests: RefObject<Map<string, Promise<unknown>>>,
  isBlocked: () => boolean
) {
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const run = (suggestionId: string) => {
    if (pendingRequests.current.has(suggestionId) || isBlocked()) {
      return;
    }

    const request = mutateAsync({ suggestionId });
    pendingRequests.current.set(suggestionId, request);
    setPendingIds((current) => new Set(current).add(suggestionId));
    void request
      .catch(() => undefined)
      .finally(() => {
        pendingRequests.current.delete(suggestionId);
        setPendingIds((current) => {
          const next = new Set(current);
          next.delete(suggestionId);
          return next;
        });
      });
  };

  return [pendingIds, run] as const;
}

function suggestionColumns({
  acceptingSuggestionIds,
  dismissingSuggestionIds,
  disabled,
  onAccept,
  onDismiss,
  onOpen,
}: SuggestionColumnsOptions): TableColumn<GeoPromptSuggestion>[] {
  return [
    {
      key: "prompt",
      header: "Prompt",
      minWidth: "16rem",
      sortable: true,
      width: "1fr",
      cell: (row) => (
        <button
          aria-label={`Open details: ${row.prompt}`}
          className="focus-visible:ring-ring flex min-h-8 w-full min-w-0 items-center rounded-sm text-left hover:underline focus-visible:ring-2"
          onClick={() => onOpen(row)}
          type="button"
        >
          <span className="text-sm leading-snug font-medium wrap-anywhere">
            {row.prompt}
          </span>
        </button>
      ),
    },
    {
      key: "impressions",
      align: "right",
      header: "Impressions",
      sortable: true,
      width: "7.5rem",
      cell: (row) => (
        <span className="tabular-nums">
          {formatCount(suggestionKeywordTotals(row.keywords).impressions)}
        </span>
      ),
      sortValue: (row) => suggestionKeywordTotals(row.keywords).impressions,
    },
    {
      key: "clicks",
      align: "right",
      header: "Clicks",
      sortable: true,
      width: "6rem",
      cell: (row) => (
        <span className="tabular-nums">
          {formatCount(suggestionKeywordTotals(row.keywords).clicks)}
        </span>
      ),
      sortValue: (row) => suggestionKeywordTotals(row.keywords).clicks,
    },
    {
      key: "position",
      align: "right",
      header: "Position",
      sortable: true,
      width: "6.5rem",
      cell: (row) => {
        const { position } = suggestionKeywordTotals(row.keywords);
        return (
          <span className="tabular-nums">
            {position === null ? "–" : `#${position.toFixed(1)}`}
          </span>
        );
      },
      sortValue: (row) =>
        suggestionKeywordTotals(row.keywords).position ??
        Number.MAX_SAFE_INTEGER,
    },
    {
      key: "actions",
      align: "right",
      header: "",
      minWidth: "9.5rem",
      width: "9.5rem",
      cell: (row) => {
        const accepting = acceptingSuggestionIds.has(row.id);
        const dismissing = dismissingSuggestionIds.has(row.id);
        return (
          <SuggestionRowActions
            accepting={accepting}
            disabled={disabled || accepting || dismissing}
            dismissing={dismissing}
            onAccept={() => onAccept(row.id)}
            onDismiss={() => onDismiss(row)}
            suggestion={row}
          />
        );
      },
    },
  ];
}

function gscConnectPromo(
  isSearchConsolePending: boolean,
  searchConsoleStatus: PromptSuggestionsToolbarProps["status"]
): boolean {
  return (
    !isSearchConsolePending &&
    searchConsoleStatus !== undefined &&
    !searchConsoleStatus.connected
  );
}

function showGscSuggestionsCard(
  dismissed: boolean,
  isSearchConsolePending: boolean,
  searchConsoleStatus: PromptSuggestionsToolbarProps["status"],
  connectPromo: boolean
): boolean {
  return !(
    dismissed &&
    (isSearchConsolePending || !searchConsoleStatus || connectPromo)
  );
}

function PromptSuggestionsToolbar({
  checking,
  showSearchConsole,
  trackAllPending,
  suggestionsCount,
  callbackPath,
  isSearchConsolePending,
  connectPromo,
  onDismissCard,
  onPropertyPickerOpenChange,
  organizationId,
  propertyPickerOpen,
  status,
  onTrackAll,
}: PromptSuggestionsToolbarProps) {
  const trackAllAction =
    !checking && suggestionsCount > 1 ? (
      <Button
        disabled={trackAllPending}
        onClick={onTrackAll}
        size="sm"
        variant="outline"
      >
        {trackAllPending ? (
          <StatusSpinner />
        ) : (
          <HugeiconsIcon icon={PlusSignIcon} size={14} />
        )}
        {trackAllPending ? "Adding…" : "Track all"}
      </Button>
    ) : null;

  if (showSearchConsole) {
    return (
      <SearchConsoleToolbar
        action={trackAllAction}
        callbackPath={callbackPath}
        isPending={isSearchConsolePending}
        onDismiss={connectPromo ? onDismissCard : undefined}
        onPropertyPickerOpenChange={onPropertyPickerOpenChange}
        organizationId={organizationId}
        propertyPickerOpen={propertyPickerOpen}
        status={status}
      />
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          {checking ? <StatusSpinner /> : null}
          Suggested prompts
        </h2>
        <p className="text-muted-foreground text-sm">
          Based on queries your site already ranks for
        </p>
      </div>
      {trackAllAction}
    </div>
  );
}

function DismissSuggestionDialog({
  suggestion,
  onOpenChange,
  onConfirm,
}: DismissSuggestionDialogProps) {
  return (
    <ResponsiveAlertDialog
      onOpenChange={onOpenChange}
      open={suggestion !== null}
    >
      <ResponsiveAlertDialogContent className="sm:max-w-md">
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle>
            Remove suggestion?
          </ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            {suggestion
              ? `"${suggestion.prompt}" won't be suggested again.`
              : null}
          </ResponsiveAlertDialogDescription>
        </ResponsiveAlertDialogHeader>
        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel onClick={() => onOpenChange(false)}>
            Cancel
          </ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction
            onClick={() => {
              if (suggestion) {
                onConfirm(suggestion.id);
              }
              onOpenChange(false);
            }}
            type="button"
            variant="destructive"
          >
            Remove
          </ResponsiveAlertDialogAction>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
}

export function PromptSuggestions({
  organizationId,
  callbackPath,
}: PromptSuggestionsProps) {
  const { data } = useGeoSuggestions(organizationId);
  const { data: searchConsoleStatus, isPending: isSearchConsolePending } =
    useGscStatus(organizationId);
  const connectionSucceeded = useGscConnectionToast();
  const { dismiss: dismissCard, dismissed } =
    useGscCardDismissal(organizationId);
  const checking = useGscAnalyzing(organizationId);
  const accept = useGeoSuggestionAccept(organizationId);
  const dismissSuggestion = useGeoSuggestionDismiss(organizationId);
  const [isTrackAllQueued, setIsTrackAllQueued] = useState(false);
  const [confirmDismiss, setConfirmDismiss] =
    useState<GeoPromptSuggestion | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [propertyPickerOpen, setPropertyPickerOpen] =
    useState(connectionSucceeded);
  const pendingSuggestionRequests = useRef(new Map<string, Promise<unknown>>());
  const trackAllQueued = useRef(false);
  const rowActionsBlocked = () => trackAllQueued.current;
  const [acceptingSuggestionIds, acceptSuggestion] = useSuggestionRowAction(
    accept.mutateAsync,
    pendingSuggestionRequests,
    rowActionsBlocked
  );
  const [dismissingSuggestionIds, dismissPromptSuggestion] =
    useSuggestionRowAction(
      dismissSuggestion.mutateAsync,
      pendingSuggestionRequests,
      rowActionsBlocked
    );
  const suggestions = (data?.suggestions ?? []).filter(
    (row) => row.source === "search_console"
  );
  const hasSuggestions = suggestions.length > 0;
  const detail = suggestions.find((row) => row.id === detailId) ?? null;
  const trackAllPending = isTrackAllQueued;
  const detailBusy =
    detail !== null &&
    (checking ||
      trackAllPending ||
      acceptingSuggestionIds.has(detail.id) ||
      dismissingSuggestionIds.has(detail.id));
  const connectPromo = gscConnectPromo(
    isSearchConsolePending,
    searchConsoleStatus
  );
  const showSearchConsole = showGscSuggestionsCard(
    dismissed,
    isSearchConsolePending,
    searchConsoleStatus,
    connectPromo
  );

  const acceptAllSuggestions = async () => {
    if (trackAllQueued.current) {
      return;
    }

    trackAllQueued.current = true;
    setIsTrackAllQueued(true);
    try {
      const remaining = suggestions.filter(
        (row) => !pendingSuggestionRequests.current.has(row.id)
      );
      const pendingResults = await Promise.allSettled([
        ...pendingSuggestionRequests.current.values(),
      ]);
      if (pendingResults.every((result) => result.status === "fulfilled")) {
        await Promise.allSettled(
          remaining.map((row) => accept.mutateAsync({ suggestionId: row.id }))
        );
      }
    } catch {
      // The mutation hook reports the error.
    }
    trackAllQueued.current = false;
    setIsTrackAllQueued(false);
  };

  const columns = suggestionColumns({
    acceptingSuggestionIds,
    dismissingSuggestionIds,
    disabled: checking || trackAllPending,
    onAccept: acceptSuggestion,
    onDismiss: setConfirmDismiss,
    onOpen: (row) => setDetailId(row.id),
  });

  if (!(checking || hasSuggestions || showSearchConsole)) {
    return null;
  }

  return (
    <section
      aria-busy={checking}
      aria-label="Suggested prompts"
      className="space-y-3"
    >
      <PromptSuggestionsToolbar
        callbackPath={callbackPath}
        checking={checking}
        connectPromo={connectPromo}
        isSearchConsolePending={isSearchConsolePending}
        onDismissCard={dismissCard}
        onPropertyPickerOpenChange={setPropertyPickerOpen}
        onTrackAll={() => {
          void acceptAllSuggestions();
        }}
        organizationId={organizationId}
        propertyPickerOpen={propertyPickerOpen}
        showSearchConsole={showSearchConsole}
        status={searchConsoleStatus}
        suggestionsCount={suggestions.length}
        trackAllPending={trackAllPending}
      />
      <Table
        className="rounded-2xl"
        columns={columns}
        data={suggestions}
        defaultSort={{ key: "impressions", direction: "desc" }}
        emptyState="No Google Search suggestions yet"
        getRowId={(row) => row.id}
        height={tableHeightFor(Math.max(suggestions.length, checking ? 3 : 1))}
        loading={checking}
        onRowClick={(row) => setDetailId(row.id)}
        resizable
        rowHeight={TABLE_ROW_HEIGHT}
        rowSizing="content"
      />
      <PromptSuggestionSheet
        actions={
          detail ? (
            <>
              <Button
                disabled={detailBusy}
                onClick={() => setConfirmDismiss(detail)}
                variant="outline"
              >
                {dismissingSuggestionIds.has(detail.id) ? (
                  <StatusSpinner />
                ) : null}
                Remove
              </Button>
              <Button
                disabled={detailBusy}
                onClick={() => acceptSuggestion(detail.id)}
              >
                {acceptingSuggestionIds.has(detail.id) ? (
                  <StatusSpinner />
                ) : null}
                {acceptingSuggestionIds.has(detail.id) ? "Adding…" : "Track"}
              </Button>
            </>
          ) : null
        }
        onOpenChange={(open) => {
          if (!open) {
            setDetailId(null);
          }
        }}
        suggestion={detail}
      />
      <DismissSuggestionDialog
        onConfirm={dismissPromptSuggestion}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDismiss(null);
          }
        }}
        suggestion={confirmDismiss}
      />
    </section>
  );
}
