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
import { useLocale, useTranslations } from "next-intl";
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
  useGeoSuggestionsAcceptAll,
  useGscAnalyzing,
  useGscStatus,
} from "@/lib/hooks/use-geo";
import { useGscConnectionToast } from "@/lib/hooks/use-gsc-connection-toast";
import type {
  DismissSuggestionDialogProps,
  PromptSuggestionsProps,
  SuggestionColumnsOptions,
  SuggestionRowActionsProps,
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
  const tCommon2 = useTranslations("common");
  const tGeoShared = useTranslations("geo.shared");
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
        {accepting ? tCommon2("labels.adding") : tGeoShared("track")}
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

export function PromptSuggestions({
  organizationId,
  callbackPath,
}: PromptSuggestionsProps) {
  const t = useTranslations("geo.promptSuggestions");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const locale = useLocale();
  const { data, isPending: suggestionsPending } =
    useGeoSuggestions(organizationId);
  const { data: searchConsoleStatus, isPending: isSearchConsolePending } =
    useGscStatus(organizationId);
  useGscConnectionToast();
  const checking = useGscAnalyzing(organizationId);
  const accept = useGeoSuggestionAccept(organizationId);
  const acceptAll = useGeoSuggestionsAcceptAll(organizationId);
  const dismissSuggestion = useGeoSuggestionDismiss(organizationId);
  const [isTrackAllQueued, setIsTrackAllQueued] = useState(false);
  const [confirmDismiss, setConfirmDismiss] =
    useState<GeoPromptSuggestion | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [propertyPickerOpen, setPropertyPickerOpen] = useState(false);
  const pendingSuggestionRequests = useRef(new Map<string, Promise<unknown>>());
  const trackAllQueued = useRef(false);
  const rowActionsBlocked = () => trackAllQueued.current || acceptAll.isPending;
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
    checking || hasSuggestions || isSearchConsoleSynced(searchConsoleStatus);
  const detail = suggestions.find((row) => row.id === detailId) ?? null;
  const trackAllPending = isTrackAllQueued || acceptAll.isPending;
  const detailBusy =
    detail !== null &&
    (checking ||
      trackAllPending ||
      acceptingSuggestionIds.has(detail.id) ||
      dismissingSuggestionIds.has(detail.id));

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
      <Button
        disabled={trackAllPending}
        onClick={() => {
          void acceptAllSuggestions();
        }}
        size="sm"
        variant="outline"
      >
        {trackAllPending ? (
          <StatusSpinner />
        ) : (
          <HugeiconsIcon icon={PlusSignIcon} size={14} />
        )}
        {trackAllPending ? tCommon2("labels.adding") : t("trackAll")}
      </Button>
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
        <Table
          className="rounded-2xl"
          columns={columns}
          data={suggestions}
          defaultSort={{ key: "impressions", direction: "desc" }}
          emptyState={t("empty")}
          getRowId={(row) => row.id}
          height={tableHeightFor(Math.max(suggestions.length, loading ? 3 : 1))}
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
            <>
              <Button
                disabled={detailBusy}
                onClick={() => setConfirmDismiss(detail)}
                variant="outline"
              >
                {dismissingSuggestionIds.has(detail.id) ? (
                  <StatusSpinner />
                ) : null}
                {tCommon("remove")}
              </Button>
              <Button
                disabled={detailBusy}
                onClick={() => acceptSuggestion(detail.id)}
              >
                {acceptingSuggestionIds.has(detail.id) ? (
                  <StatusSpinner />
                ) : null}
                {acceptingSuggestionIds.has(detail.id)
                  ? tCommon2("labels.adding")
                  : tGeoShared("track")}
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
