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
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import { useRef, useState } from "react";

import { Button } from "@/components/button";
import { SearchConsoleToolbar } from "@/components/geo/search-console-card";
import { StatusSpinner } from "@/components/geo/status-spinner";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import {
  useGeoSuggestionAccept,
  useGeoSuggestionDismiss,
  useGeoSuggestions,
  useGeoSuggestionsAcceptAll,
  useGscAnalyzing,
  useGscCardDismissal,
  useGscStatus,
} from "@/lib/hooks/use-geo";
import { useGscConnectionToast } from "@/lib/hooks/use-gsc-connection-toast";
import type {
  PromptSuggestionsProps,
  SuggestionRowActionsProps,
} from "@/types/components/geo";
import type { GeoPromptSuggestion } from "@/types/geo";
import { tableHeightFor } from "@/utils/table";

function totalImpressions(suggestion: GeoPromptSuggestion): number {
  return suggestion.keywords.reduce(
    (total, keyword) => total + keyword.impressions,
    0
  );
}

function totalClicks(suggestion: GeoPromptSuggestion): number {
  return suggestion.keywords.reduce(
    (total, keyword) => total + keyword.clicks,
    0
  );
}

function bestPosition(suggestion: GeoPromptSuggestion): number | null {
  if (suggestion.keywords.length === 0) {
    return null;
  }
  return Math.min(...suggestion.keywords.map((keyword) => keyword.position));
}

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
  const acceptAll = useGeoSuggestionsAcceptAll(organizationId);
  const dismissSuggestion = useGeoSuggestionDismiss(organizationId);
  const [acceptingSuggestionIds, setAcceptingSuggestionIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [dismissingSuggestionIds, setDismissingSuggestionIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [isTrackAllQueued, setIsTrackAllQueued] = useState(false);
  const [confirmDismiss, setConfirmDismiss] =
    useState<GeoPromptSuggestion | null>(null);
  const [propertyPickerOpen, setPropertyPickerOpen] =
    useState(connectionSucceeded);
  const pendingSuggestionRequests = useRef(new Map<string, Promise<unknown>>());
  const trackAllQueued = useRef(false);
  const suggestions = data?.suggestions ?? [];
  const hasSuggestions = suggestions.length > 0;
  const trackAllPending = isTrackAllQueued || acceptAll.isPending;
  const connectPromo =
    !isSearchConsolePending &&
    searchConsoleStatus !== undefined &&
    !searchConsoleStatus.connected;
  const showSearchConsole = !(
    dismissed &&
    (isSearchConsolePending || !searchConsoleStatus || connectPromo)
  );

  const acceptSuggestion = (suggestionId: string) => {
    if (
      pendingSuggestionRequests.current.has(suggestionId) ||
      trackAllQueued.current ||
      acceptAll.isPending
    ) {
      return;
    }

    const request = accept.mutateAsync({ suggestionId });
    pendingSuggestionRequests.current.set(suggestionId, request);
    setAcceptingSuggestionIds((current) => new Set(current).add(suggestionId));
    void request
      .catch(() => undefined)
      .finally(() => {
        pendingSuggestionRequests.current.delete(suggestionId);
        setAcceptingSuggestionIds((current) => {
          const next = new Set(current);
          next.delete(suggestionId);
          return next;
        });
      });
  };

  const dismissPromptSuggestion = (suggestionId: string) => {
    if (
      pendingSuggestionRequests.current.has(suggestionId) ||
      trackAllQueued.current ||
      acceptAll.isPending
    ) {
      return;
    }

    const request = dismissSuggestion.mutateAsync({ suggestionId });
    pendingSuggestionRequests.current.set(suggestionId, request);
    setDismissingSuggestionIds((current) => new Set(current).add(suggestionId));
    void request
      .catch(() => undefined)
      .finally(() => {
        pendingSuggestionRequests.current.delete(suggestionId);
        setDismissingSuggestionIds((current) => {
          const next = new Set(current);
          next.delete(suggestionId);
          return next;
        });
      });
  };

  const acceptAllSuggestions = async () => {
    if (trackAllQueued.current || acceptAll.isPending) {
      return;
    }

    trackAllQueued.current = true;
    setIsTrackAllQueued(true);
    try {
      const pendingResults = await Promise.allSettled([
        ...pendingSuggestionRequests.current.values(),
      ]);
      if (pendingResults.some((result) => result.status === "rejected")) {
        return;
      }
      await acceptAll.mutateAsync();
    } catch {
      // The mutation hook reports the error.
    } finally {
      trackAllQueued.current = false;
      setIsTrackAllQueued(false);
    }
  };

  const columns: TableColumn<GeoPromptSuggestion>[] = [
    {
      key: "prompt",
      header: "Prompt",
      minWidth: "16rem",
      sortable: true,
      width: "1fr",
      cell: (row) => {
        const queries = row.keywords.map((keyword) => keyword.query).join(", ");
        return (
          <span className="flex min-w-0 flex-col gap-0.5">
            <TruncateWithTooltip className="text-sm leading-snug font-medium">
              {row.prompt}
            </TruncateWithTooltip>
            {queries ? (
              <TruncateWithTooltip className="text-muted-foreground text-xs leading-snug">
                {queries}
              </TruncateWithTooltip>
            ) : null}
          </span>
        );
      },
    },
    {
      key: "impressions",
      align: "right",
      header: "Impressions",
      sortable: true,
      width: "9rem",
      cell: (row) => {
        const clicks = totalClicks(row);
        return (
          <span className="flex flex-col items-end gap-0.5 tabular-nums">
            <span className="text-sm leading-snug">
              {totalImpressions(row).toLocaleString()}
            </span>
            <span className="text-muted-foreground text-xs leading-snug">
              {clicks.toLocaleString()} {clicks === 1 ? "click" : "clicks"}
            </span>
          </span>
        );
      },
      sortValue: totalImpressions,
    },
    {
      key: "position",
      align: "right",
      header: "Position",
      sortable: true,
      width: "7.5rem",
      cell: (row) => {
        const position = bestPosition(row);
        return (
          <span className="text-sm tabular-nums">
            {position === null ? "–" : `#${position.toFixed(1)}`}
          </span>
        );
      },
      sortValue: (row) => bestPosition(row) ?? Number.MAX_SAFE_INTEGER,
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
            disabled={checking || trackAllPending || accepting || dismissing}
            dismissing={dismissing}
            onAccept={() => acceptSuggestion(row.id)}
            onDismiss={() => setConfirmDismiss(row)}
            suggestion={row}
          />
        );
      },
    },
  ];

  if (!(checking || hasSuggestions || showSearchConsole)) {
    return null;
  }

  const trackAllAction =
    !checking && suggestions.length > 1 ? (
      <Button
        disabled={trackAllPending}
        onClick={acceptAllSuggestions}
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

  const toolbar = showSearchConsole ? (
    <SearchConsoleToolbar
      action={trackAllAction}
      callbackPath={callbackPath}
      isPending={isSearchConsolePending}
      onDismiss={connectPromo ? dismissCard : undefined}
      onPropertyPickerOpenChange={setPropertyPickerOpen}
      organizationId={organizationId}
      propertyPickerOpen={propertyPickerOpen}
      status={searchConsoleStatus}
    />
  ) : (
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

  return (
    <section
      aria-busy={checking}
      aria-label="Suggested prompts"
      className="space-y-3"
    >
      {toolbar}
      <Table
        className="rounded-2xl"
        columns={columns}
        data={suggestions}
        defaultSort={{ key: "impressions", direction: "desc" }}
        emptyState="No Google Search suggestions yet"
        getRowId={(row) => row.id}
        height={tableHeightFor(Math.max(suggestions.length, checking ? 3 : 1))}
        loading={checking && !hasSuggestions}
        resizable
        rowHeight={TABLE_ROW_HEIGHT}
      />
      <ResponsiveAlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDismiss(null);
          }
        }}
        open={confirmDismiss !== null}
      >
        <ResponsiveAlertDialogContent className="sm:max-w-md">
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>
              Remove suggestion?
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              {confirmDismiss
                ? `"${confirmDismiss.prompt}" won't be suggested again.`
                : null}
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel
              onClick={() => setConfirmDismiss(null)}
            >
              Cancel
            </ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              onClick={() => {
                if (confirmDismiss) {
                  dismissPromptSuggestion(confirmDismiss.id);
                }
                setConfirmDismiss(null);
              }}
              type="button"
              variant="destructive"
            >
              Remove
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </section>
  );
}
