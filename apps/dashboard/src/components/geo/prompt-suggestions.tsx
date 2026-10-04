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
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import { useLocale, useTranslations } from "next-intl";
import { type RefObject, useRef, useState } from "react";

import { Button } from "@/components/button";
import { PromptSuggestionSheet } from "@/components/geo/prompt-suggestion-sheet";
import { SearchConsoleToolbar } from "@/components/geo/search-console-card";
import { StatusSpinner } from "@/components/geo/status-spinner";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import {
  useGeoSuggestionAccept,
  useGeoSuggestionDismiss,
  useGeoSuggestions,
  useGeoSuggestionsAcceptAll,
  useGscAnalyzing,
  useGscStatus,
} from "@/lib/hooks/use-geo";
import { useGscConnectionToast } from "@/lib/hooks/use-gsc-connection-toast";
import type {
  DismissSuggestionDialogProps,
  PromptSuggestionsProps,
  SuggestionColumnsOptions,
  SuggestionDetailActionsProps,
  SuggestionRowActionsProps,
  TrackAllButtonProps,
} from "@/types/components/geo";
import type { GeoPromptSuggestion } from "@/types/geo";
import { formatCount, formatOneDecimal } from "@/utils/format";
import { suggestionKeywordTotals } from "@/utils/geo-prompt-suggestions";
import { isSearchConsoleSynced } from "@/utils/gsc-site-url";
import { tableHeightFor } from "@/utils/table";

function SuggestionRowActions({
  accepting,
  disabled,
  dismissing,
  onAccept,
  onDismiss,
  suggestion,
}: SuggestionRowActionsProps) {
  const tGeoShared = useTranslations("geo.shared");
  return (
    <div className="flex h-full shrink-0 items-center justify-end gap-1">
      <Button
        aria-busy={accepting}
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
        {tGeoShared("track")}
      </Button>
      <Button
        aria-label={tGeoShared("removePrompt", { prompt: suggestion.prompt })}
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
  labels,
  locale,
}: SuggestionColumnsOptions): TableColumn<GeoPromptSuggestion>[] {
  return [
    {
      key: "prompt",
      header: labels.prompt,
      minWidth: "16rem",
      sortable: true,
      width: "1fr",
      cell: (row) => (
        <button
          aria-label={labels.openDetails(row.prompt)}
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
      header: labels.impressions,
      sortable: true,
      width: "7.5rem",
      cell: (row) => (
        <span className="tabular-nums">
          {formatCount(
            suggestionKeywordTotals(row.keywords).impressions,
            locale
          )}
        </span>
      ),
      sortValue: (row) => suggestionKeywordTotals(row.keywords).impressions,
    },
    {
      key: "clicks",
      align: "right",
      header: labels.clicks,
      sortable: true,
      width: "6rem",
      cell: (row) => (
        <span className="tabular-nums">
          {formatCount(suggestionKeywordTotals(row.keywords).clicks, locale)}
        </span>
      ),
      sortValue: (row) => suggestionKeywordTotals(row.keywords).clicks,
    },
    {
      key: "position",
      align: "right",
      header: labels.position,
      sortable: true,
      width: "6.5rem",
      cell: (row) => {
        const { position } = suggestionKeywordTotals(row.keywords);
        return (
          <span className="tabular-nums">
            {position === null ? "–" : `#${formatOneDecimal(position, locale)}`}
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

function DismissSuggestionDialog({
  suggestion,
  onOpenChange,
  onConfirm,
}: DismissSuggestionDialogProps) {
  const t = useTranslations("geo.promptSuggestions");
  const tCommon = useTranslations("common.actions");
  return (
    <ResponsiveAlertDialog
      onOpenChange={onOpenChange}
      open={suggestion !== null}
    >
      <ResponsiveAlertDialogContent className="sm:max-w-md">
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle>
            {t("dismissTitle")}
          </ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            {suggestion
              ? t("dismissDescription", { prompt: suggestion.prompt })
              : null}
          </ResponsiveAlertDialogDescription>
        </ResponsiveAlertDialogHeader>
        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
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
            {tCommon("remove")}
          </ResponsiveAlertDialogAction>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
}

function TrackAllButton({ pending, onClick }: TrackAllButtonProps) {
  const t = useTranslations("geo.promptSuggestions");
  return (
    <Button
      aria-busy={pending}
      disabled={pending}
      onClick={onClick}
      size="sm"
      variant="outline"
    >
      {pending ? (
        <StatusSpinner />
      ) : (
        <HugeiconsIcon icon={PlusSignIcon} size={14} />
      )}
      {t("trackAll")}
    </Button>
  );
}

function SuggestionDetailActions({
  accepting,
  disabled,
  dismissing,
  onAccept,
  onDismiss,
}: SuggestionDetailActionsProps) {
  const tGeoShared = useTranslations("geo.shared");
  const tActions = useTranslations("common.actions");
  return (
    <>
      <Button disabled={disabled} onClick={onDismiss} variant="outline">
        {dismissing ? <StatusSpinner /> : null}
        {tActions("remove")}
      </Button>
      <Button aria-busy={accepting} disabled={disabled} onClick={onAccept}>
        {accepting ? <StatusSpinner /> : null}
        {tGeoShared("track")}
      </Button>
    </>
  );
}

/** Whether the open suggestion can't take an action right now. */
function isSuggestionBusy(
  suggestion: GeoPromptSuggestion | null,
  state: {
    blocked: boolean;
    accepting: ReadonlySet<string>;
    dismissing: ReadonlySet<string>;
  }
): boolean {
  if (!suggestion) {
    return false;
  }
  return (
    state.blocked ||
    state.accepting.has(suggestion.id) ||
    state.dismissing.has(suggestion.id)
  );
}

/** Accepts the rest once every in-flight row request settled without error. */
async function acceptAllAfterPending(
  pendingRequests: Map<string, Promise<unknown>>,
  acceptAll: () => Promise<unknown>
): Promise<void> {
  const pendingResults = await Promise.allSettled([
    ...pendingRequests.values(),
  ]);
  if (pendingResults.some((result) => result.status === "rejected")) {
    return;
  }
  await acceptAll();
}

/**
 * "Track all" waits for any single-row accept or dismiss still in flight, then
 * accepts the rest. While it is queued, row actions are blocked.
 */
function useTrackAllQueue(
  acceptAll: { isPending: boolean; mutateAsync: () => Promise<unknown> },
  pendingRequests: RefObject<Map<string, Promise<unknown>>>
) {
  const [isQueued, setIsQueued] = useState(false);
  const queued = useRef(false);

  const run = async () => {
    if (queued.current || acceptAll.isPending) {
      return;
    }
    queued.current = true;
    setIsQueued(true);
    // No try/finally here: React Compiler can't compile it inside a hook.
    await acceptAllAfterPending(
      pendingRequests.current,
      acceptAll.mutateAsync
    ).catch(() => {
      // The mutation hook reports the error.
    });
    queued.current = false;
    setIsQueued(false);
  };

  return {
    run,
    pending: isQueued || acceptAll.isPending,
    isBlocked: () => queued.current || acceptAll.isPending,
  };
}

export function PromptSuggestions({
  organizationId,
  callbackPath,
  onViewTrackedPrompt,
}: PromptSuggestionsProps) {
  const t = useTranslations("geo.promptSuggestions");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon2 = useTranslations("common");
  const locale = useLocale();
  const { data, isPending: suggestionsPending } =
    useGeoSuggestions(organizationId);
  const { data: searchConsoleStatus, isPending: isSearchConsolePending } =
    useGscStatus(organizationId);
  useGscConnectionToast();
  const checking = useGscAnalyzing(organizationId);
  const accept = useGeoSuggestionAccept(organizationId, onViewTrackedPrompt);
  const acceptAll = useGeoSuggestionsAcceptAll(organizationId, () =>
    onViewTrackedPrompt()
  );
  const dismissSuggestion = useGeoSuggestionDismiss(organizationId);
  const [confirmDismiss, setConfirmDismiss] =
    useState<GeoPromptSuggestion | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [propertyPickerOpen, setPropertyPickerOpen] = useState(false);
  const pendingSuggestionRequests = useRef(new Map<string, Promise<unknown>>());
  const trackAll = useTrackAllQueue(acceptAll, pendingSuggestionRequests);
  const rowActionsBlocked = trackAll.isBlocked;
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
  const suggestions = data?.suggestions ?? [];
  const hasSuggestions = suggestions.length > 0;
  const loading = checking || suggestionsPending;
  const showSuggestionsTable =
    loading || hasSuggestions || isSearchConsoleSynced(searchConsoleStatus);
  const detail = suggestions.find((row) => row.id === detailId) ?? null;
  const trackAllPending = trackAll.pending;
  const detailBusy = isSuggestionBusy(detail, {
    blocked: checking || trackAllPending,
    accepting: acceptingSuggestionIds,
    dismissing: dismissingSuggestionIds,
  });

  const columns = suggestionColumns({
    acceptingSuggestionIds,
    dismissingSuggestionIds,
    disabled: checking || trackAllPending,
    onAccept: acceptSuggestion,
    onDismiss: setConfirmDismiss,
    onOpen: (row) => setDetailId(row.id),
    locale,
    labels: {
      prompt: tGeoShared("prompt"),
      impressions: tCommon2("labels.impressions"),
      clicks: tCommon2("labels.clicks"),
      position: tCommon2("labels.position"),
      openDetails: (prompt) => tGeoShared("openDetailsPrompt", { prompt }),
    },
  });

  const trackAllAction =
    !checking && suggestions.length > 1 ? (
      <TrackAllButton
        onClick={() => {
          void trackAll.run();
        }}
        pending={trackAllPending}
      />
    ) : null;

  return (
    <section
      aria-busy={loading}
      aria-label={tGeoShared("suggestedPrompts")}
      className="space-y-4"
    >
      <SearchConsoleToolbar
        action={trackAllAction}
        callbackPath={callbackPath}
        isPending={isSearchConsolePending}
        onPropertyPickerOpenChange={setPropertyPickerOpen}
        organizationId={organizationId}
        propertyPickerOpen={propertyPickerOpen}
        status={searchConsoleStatus}
      />
      {showSuggestionsTable ? (
        <DataTable
          autoHeight
          columns={columns}
          data={suggestions}
          defaultSort={{ key: "impressions", direction: "desc" }}
          emptyState={t("empty")}
          getRowId={(row) => row.id}
          height={tableHeightFor(loading ? 3 : 1)}
          loading={loading}
          onRowClick={(row) => setDetailId(row.id)}
          resizable
          rowHeight={TABLE_ROW_HEIGHT}
          rowSizing="content"
        />
      ) : null}
      <PromptSuggestionSheet
        actions={
          detail ? (
            <SuggestionDetailActions
              accepting={acceptingSuggestionIds.has(detail.id)}
              disabled={detailBusy}
              dismissing={dismissingSuggestionIds.has(detail.id)}
              onAccept={() => acceptSuggestion(detail.id)}
              onDismiss={() => setConfirmDismiss(detail)}
            />
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
