"use client";

import {
  SplitModalContent,
  SplitModalPane,
} from "@notra/ui/components/shared/split-modal";
import { Dialog, DialogTitle } from "@notra/ui/components/ui/dialog";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/button";
import { DesignSystemFrame } from "@/components/design-system/design-system-frame";
import { WebhookCreateDialogView } from "@/components/webhooks/create-dialog";
import { WebhookDetailsSheetView } from "@/components/webhooks/details-sheet";
import { WebhookWorkspaceView } from "@/components/webhooks/workspace";
import {
  DESIGN_SYSTEM_WEBHOOK_DELIVERIES,
  DESIGN_SYSTEM_WEBHOOK_DETAILS,
  DESIGN_SYSTEM_WEBHOOK_ENDPOINTS,
  DESIGN_SYSTEM_WEBHOOK_SECRET,
  DESIGN_SYSTEM_WEBHOOK_STATS,
  DESIGN_SYSTEM_WEBHOOK_STATS_EMPTY,
  DESIGN_SYSTEM_WEBHOOK_STATS_UNHEALTHY,
  webhookActivityFor,
} from "@/constants/design-system-webhooks";
import { useIsClient } from "@/lib/hooks/use-is-client";
import type {
  OutboundDelivery,
  WebhookDeliveryDetail,
  WebhookFilter,
  WebhookWorkspaceViewProps,
} from "@/types/webhooks/outbound";

type SampleProps = Partial<
  Pick<
    WebhookWorkspaceViewProps,
    | "stats"
    | "endpoints"
    | "canManage"
    | "loading"
    | "error"
    | "defaultTab"
    | "hasMore"
  >
> & {
  readonly rows?: OutboundDelivery[];
  readonly initialFilter?: WebhookFilter;
};

const PREVIEW_PENDING_MS = 1500;

const DETAIL_BY_STATUS: Partial<
  Record<OutboundDelivery["status"], WebhookDeliveryDetail>
> = DESIGN_SYSTEM_WEBHOOK_DETAILS;

function PaneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="bg-card max-w-3xl rounded-[21px] border p-5 text-sm">
      {children}
    </div>
  );
}

function Sample({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{note}</p>
      </div>
      {children}
    </section>
  );
}

function WorkspaceSample({
  rows = DESIGN_SYSTEM_WEBHOOK_DELIVERIES,
  stats = DESIGN_SYSTEM_WEBHOOK_STATS,
  endpoints = DESIGN_SYSTEM_WEBHOOK_ENDPOINTS,
  canManage = true,
  loading = false,
  error = null,
  defaultTab,
  hasMore = false,
  initialFilter = "all",
}: SampleProps) {
  const [filter, setFilter] = useState<WebhookFilter>(initialFilter);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<OutboundDelivery | null>(null);
  const [creating, setCreating] = useState(false);
  const visible =
    filter === "all" ? rows : rows.filter((row) => row.status === filter);
  return (
    <>
      <WebhookWorkspaceView
        stats={loading ? undefined : stats}
        activity={loading ? undefined : webhookActivityFor(stats)}
        endpoints={endpoints}
        rows={loading ? [] : visible}
        canManage={canManage}
        loading={loading}
        fetching={loading}
        error={error}
        filter={filter}
        offset={offset}
        hasMore={hasMore && offset === 0}
        removing={false}
        defaultTab={defaultTab}
        onFilter={(next) => {
          setFilter(next);
          setOffset(0);
        }}
        onPage={setOffset}
        onRefresh={() => undefined}
        onSelect={setSelected}
        onCreate={() => setCreating(true)}
        onRemove={() => undefined}
      />
      <WebhookCreateDialogView
        open={creating}
        onOpenChange={setCreating}
        secret={null}
        pending={false}
        onSubmit={() => undefined}
      />
      <WebhookDetailsSheetView
        delivery={selected}
        detail={selected ? DETAIL_BY_STATUS[selected.status] : undefined}
        loading={false}
        error={null}
        onReload={() => undefined}
        onClose={() => setSelected(null)}
        onRetry={() => setSelected(null)}
        retrying={false}
        canRetry={canManage}
      />
    </>
  );
}

function OverlayTriggers() {
  const [create, setCreate] = useState<"form" | "pending" | "secret" | null>(
    null
  );
  const [detail, setDetail] = useState<
    keyof typeof DESIGN_SYSTEM_WEBHOOK_DETAILS | "loading" | "error" | null
  >(null);
  // "Creating…" blocks every close path, so resolve it like a real request would.
  useEffect(() => {
    if (create !== "pending") {
      return;
    }
    const timer = setTimeout(() => setCreate("secret"), PREVIEW_PENDING_MS);
    return () => clearTimeout(timer);
  }, [create]);
  const detailFixture =
    detail === "loading" || detail === "error" || detail === null
      ? undefined
      : DESIGN_SYSTEM_WEBHOOK_DETAILS[detail];
  const baseDelivery =
    detail === "loading" || detail === "error"
      ? DESIGN_SYSTEM_WEBHOOK_DETAILS.failed.delivery
      : (detailFixture?.delivery ?? null);
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => setCreate("form")}>
        Add endpoint form
      </Button>
      <Button variant="outline" onClick={() => setCreate("pending")}>
        Creating…
      </Button>
      <Button variant="outline" onClick={() => setCreate("secret")}>
        Signing secret
      </Button>
      {(["succeeded", "failed", "retrying", "pending"] as const).map(
        (status) => (
          <Button
            key={status}
            variant="outline"
            onClick={() => setDetail(status)}
          >
            Details: {status}
          </Button>
        )
      )}
      <Button variant="outline" onClick={() => setDetail("loading")}>
        Details: loading
      </Button>
      <Button variant="outline" onClick={() => setDetail("error")}>
        Details: error
      </Button>
      {create ? (
        <WebhookCreateDialogView
          open
          onOpenChange={(open) => {
            if (!open) {
              setCreate(null);
            }
          }}
          secret={create === "secret" ? DESIGN_SYSTEM_WEBHOOK_SECRET : null}
          pending={create === "pending"}
          onSubmit={() => setCreate("secret")}
        />
      ) : null}
      <WebhookDetailsSheetView
        delivery={detail ? baseDelivery : null}
        detail={detailFixture}
        loading={detail === "loading"}
        error={detail === "error" ? "Unable to load this delivery." : null}
        onReload={() => setDetail("failed")}
        onClose={() => setDetail(null)}
        onRetry={() => setDetail(null)}
        retrying={false}
        canRetry
      />
    </div>
  );
}

function SettingsModalSample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open inside settings modal
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <SplitModalContent className="top-1/2 left-1/2 flex! h-[min(44rem,calc(100svh-2rem))] w-[min(52rem,calc(100%-1.5rem))] max-w-none -translate-x-1/2 -translate-y-1/2 transition-[box-shadow,filter] data-nested-dialog-open:shadow-[0_0_0_100vmax_rgb(0_0_0/0.4)] data-nested-dialog-open:brightness-60 sm:max-w-none">
          <SplitModalPane>
            <header className="border-b px-5 py-3.5">
              <DialogTitle className="text-sm font-medium">
                Webhooks
              </DialogTitle>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm">
              <WorkspaceSample hasMore />
            </div>
          </SplitModalPane>
        </SplitModalContent>
      </Dialog>
    </>
  );
}

export default function WebhooksDesignSystemClientPage() {
  // Fixture timestamps are relative to page load, so skip SSR to avoid hydration drift.
  const isClient = useIsClient();
  return (
    <DesignSystemFrame
      title="Webhooks"
      description="Every state of the webhooks settings pane, rendered from fixtures. Click a delivery row to open its details, or Add endpoint for the create dialog."
    >
      {isClient ? (
        <div className="space-y-12">
          <Sample
            title="Healthy, with deliveries"
            note="Mixed statuses, three endpoints, more pages to load."
          >
            <PaneFrame>
              <WorkspaceSample hasMore />
            </PaneFrame>
          </Sample>
          <Sample
            title="Failing endpoint"
            note="High failure share; the red traces show when it started."
          >
            <PaneFrame>
              <WorkspaceSample
                stats={DESIGN_SYSTEM_WEBHOOK_STATS_UNHEALTHY}
                rows={DESIGN_SYSTEM_WEBHOOK_DELIVERIES.filter(
                  (row) => row.status === "failed" || row.status === "retrying"
                )}
              />
            </PaneFrame>
          </Sample>
          <Sample
            title="Loading"
            note="First load, before the overview returns."
          >
            <PaneFrame>
              <WorkspaceSample loading />
            </PaneFrame>
          </Sample>
          <Sample title="First visit" note="No endpoints, no deliveries.">
            <PaneFrame>
              <WorkspaceSample
                stats={DESIGN_SYSTEM_WEBHOOK_STATS_EMPTY}
                rows={[]}
                endpoints={[]}
              />
            </PaneFrame>
          </Sample>
          <Sample
            title="Endpoint added, nothing sent yet"
            note="Endpoints exist but no event fired in the last 30 days."
          >
            <PaneFrame>
              <WorkspaceSample
                stats={DESIGN_SYSTEM_WEBHOOK_STATS_EMPTY}
                rows={[]}
              />
            </PaneFrame>
          </Sample>
          <Sample
            title="Filter with no matches"
            note="Status filter set to Cancelled on an org that never cancelled a delivery."
          >
            <PaneFrame>
              <WorkspaceSample
                initialFilter="cancelled"
                rows={DESIGN_SYSTEM_WEBHOOK_DELIVERIES.filter(
                  (row) => row.status !== "cancelled"
                )}
              />
            </PaneFrame>
          </Sample>
          <Sample
            title="Refresh failed"
            note="The last poll failed; cached data stays visible."
          >
            <PaneFrame>
              <WorkspaceSample error="Unable to load webhook activity. Check your connection and try again." />
            </PaneFrame>
          </Sample>
          <Sample
            title="Read-only member"
            note="Members without manage rights can look but not add, remove, or retry."
          >
            <PaneFrame>
              <WorkspaceSample canManage={false} />
            </PaneFrame>
          </Sample>
          <Sample
            title="Endpoints tab"
            note="Three endpoints with their events."
          >
            <PaneFrame>
              <WorkspaceSample defaultTab="endpoints" />
            </PaneFrame>
          </Sample>
          <Sample
            title="Endpoints tab, empty"
            note="No endpoint connected yet."
          >
            <PaneFrame>
              <WorkspaceSample
                defaultTab="endpoints"
                endpoints={[]}
                stats={DESIGN_SYSTEM_WEBHOOK_STATS_EMPTY}
                rows={[]}
              />
            </PaneFrame>
          </Sample>
          <Sample
            title="Dialogs and sheets"
            note="Create flow and delivery details in every state."
          >
            <OverlayTriggers />
          </Sample>
          <Sample
            title="Inside the settings modal"
            note="Nested dialogs: clicking outside the add-endpoint dialog closes it, the settings modal stays open."
          >
            <SettingsModalSample />
          </Sample>
        </div>
      ) : null}
    </DesignSystemFrame>
  );
}
