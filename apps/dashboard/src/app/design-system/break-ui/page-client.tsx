"use client";

import {
  SidebarFooter,
  SidebarProvider,
} from "@notra/ui/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { CollectionsView } from "@/components/content/collections-view";
import { FeedbackProvider } from "@/components/dashboard/feedback-context";
import { OrgSelector } from "@/components/dashboard/org-selector";
import { DesignSystemFrame } from "@/components/design-system/design-system-frame";
import { SentimentBreakdown } from "@/components/geo/sentiment-breakdown";
import { SentimentBreakdownPlaceholder } from "@/components/geo/sentiment-breakdown-placeholder";
import { OrganizationsProvider } from "@/components/providers/organization-provider";
import { MembersSettingsPane } from "@/components/settings/panes/members-pane";
import {
  BREAK_UI_DATASET_LABELS,
  BREAK_UI_DATASETS,
  BREAK_UI_FIXTURES,
  PREVIEW_WRITE_PROCEDURE,
} from "@/constants/design-system-break-ui";
import { SIDEBAR_MIN_WIDTH } from "@/constants/nav";
import { useIsClient } from "@/lib/hooks/use-is-client";
import { cn } from "@/lib/utils";
import type { ContentCollectionView } from "@/types/content/collection";
import type {
  BreakUiDataset,
  BreakUiFixture,
} from "@/types/design-system/break-ui";
import { QUERY_KEYS } from "@/utils/query-keys";

const COLLECTIONS_PAGE_SIZE = 20;

const datasetParser = parseAsStringLiteral(BREAK_UI_DATASETS)
  .withDefault("demo")
  .withOptions({ clearOnDefault: true });

/**
 * Seeds the same query keys the real components read, so fixtures enter
 * through the data boundary instead of through props the app never passes.
 */
function fixtureQueryClient(fixture: BreakUiFixture) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Number.POSITIVE_INFINITY,
        retry: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
      },
    },
  });
  const orgId = fixture.activeOrganization.id;
  client.setQueryData(QUERY_KEYS.AUTH.organizations, fixture.organizations);
  client.setQueryData(
    QUERY_KEYS.AUTH.activeOrganization,
    fixture.activeOrganization
  );
  client.setQueryData(["members", orgId], {
    members: fixture.members,
    total: fixture.members.length,
  });
  client.setQueryData(["invitations", orgId], fixture.invitations);
  return client;
}

function Sample({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <section className="scroll-mt-8 space-y-3" id={id}>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{note}</p>
      </div>
      {children}
    </section>
  );
}

function DatasetToggle({
  value,
  onChange,
}: {
  value: BreakUiDataset;
  onChange: (next: BreakUiDataset) => void;
}) {
  return (
    <div
      aria-label="Fixture data"
      className="bg-muted fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 gap-0.5 overflow-x-auto rounded-full border p-1 font-sans text-xs shadow-lg"
      role="group"
    >
      {BREAK_UI_DATASETS.map((dataset) => (
        <button
          aria-pressed={dataset === value}
          className={cn(
            "text-muted-foreground shrink-0 rounded-full px-3 py-1.5 whitespace-nowrap",
            dataset === value && "bg-background text-foreground shadow-sm"
          )}
          data-dataset={dataset}
          key={dataset}
          onClick={() => onChange(dataset)}
          type="button"
        >
          {BREAK_UI_DATASET_LABELS[dataset]}
        </button>
      ))}
    </div>
  );
}

function SentimentSample({ fixture }: { fixture: BreakUiFixture }) {
  return (
    <div className="@container/main">
      {fixture.sentiment ? (
        <SentimentBreakdown data={fixture.sentiment} isScanning={false} />
      ) : (
        <SentimentBreakdownPlaceholder
          emptyKey="noSavedAnswers"
          isScanning={false}
          retry={() => undefined}
          state="empty"
        />
      )}
    </div>
  );
}

/**
 * The pager pages through `collectionTotal` rows while the fixture holds a
 * handful; repeat them with distinct ids and names so every page differs.
 */
function collectionsForPage(
  collections: BreakUiFixture["collections"],
  total: number,
  page: number
): BreakUiFixture["collections"] {
  if (collections.length === 0 || total <= collections.length) {
    return collections;
  }
  const offset = (page - 1) * COLLECTIONS_PAGE_SIZE;
  const count = Math.max(0, Math.min(COLLECTIONS_PAGE_SIZE, total - offset));
  return Array.from({ length: count }, (_, index) => offset + index).flatMap(
    (position) => {
      const base = collections[position % collections.length];
      return base
        ? [
            {
              ...base,
              id: `${base.id}-${position}`,
              name: `${base.name} · ${position + 1}`,
            },
          ]
        : [];
    }
  );
}

function isPreviewWriteProcedure(procedureUrl: string) {
  const procedure = new URL(procedureUrl, window.location.origin).pathname
    .split("/")
    .at(-1);
  return PREVIEW_WRITE_PROCEDURE.test(procedure ?? "");
}

async function isPreviewWrite(request: Request) {
  const url = new URL(request.url, window.location.origin);
  if (url.origin !== window.location.origin || request.method === "GET") {
    return false;
  }
  if (
    url.pathname.startsWith("/_serverFn") ||
    url.pathname.startsWith("/api/")
  ) {
    return true;
  }
  if (!url.pathname.startsWith("/rpc/")) {
    return false;
  }
  if (!url.pathname.endsWith("/__batch__")) {
    return isPreviewWriteProcedure(url.pathname);
  }
  // A batch carries every call's own URL; one write blocks the whole batch.
  const items: unknown = await request.clone().json();
  return (
    Array.isArray(items) &&
    items.some(
      (item: unknown) =>
        typeof item === "object" &&
        item !== null &&
        "url" in item &&
        typeof item.url === "string" &&
        isPreviewWriteProcedure(item.url)
    )
  );
}

/**
 * The samples are real components wired to real clients. Writes from this
 * page (deleting a fixture collection, switching or creating an organization,
 * inviting) are answered locally instead of reaching the API. The oRPC client
 * resolves `fetch` per call, so it goes through this guard too.
 */
function usePreviewWriteGuard() {
  useEffect(() => {
    const realFetch = window.fetch;
    window.fetch = async (input, init) => {
      if (await isPreviewWrite(new Request(input, init))) {
        return Response.json(
          { message: "Disabled in the break-ui preview" },
          { status: 403 }
        );
      }
      return realFetch(input, init);
    };
    return () => {
      window.fetch = realFetch;
    };
  }, []);
}

function CollectionsSample({
  fixture,
  view,
}: {
  fixture: BreakUiFixture;
  view: ContentCollectionView;
}) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(
    1,
    Math.ceil(fixture.collectionTotal / COLLECTIONS_PAGE_SIZE)
  );
  return (
    <div className="@container/main">
      <CollectionsView
        collections={collectionsForPage(
          fixture.collections,
          fixture.collectionTotal,
          page
        )}
        organizationId={fixture.activeOrganization.id}
        organizationSlug={fixture.activeOrganization.slug}
        pagination={{
          page,
          pageCount,
          pageSize: COLLECTIONS_PAGE_SIZE,
          totalItems: fixture.collectionTotal,
          pageRowCount: collectionsForPage(
            fixture.collections,
            fixture.collectionTotal,
            page
          ).length,
          setPage,
        }}
        view={view}
      />
    </div>
  );
}

function BreakUiSamples({ dataset }: { dataset: BreakUiDataset }) {
  const fixture = BREAK_UI_FIXTURES[dataset];
  const queryClient = useMemo(() => fixtureQueryClient(fixture), [fixture]);
  usePreviewWriteGuard();
  return (
    <QueryClientProvider client={queryClient}>
      <OrganizationsProvider>
        <div className="space-y-12 pb-24">
          <Sample
            id="sentiment"
            note="GEO overview, Brand sentiment card. Score and By engine list from a GeoSentimentResponse fixture."
            title="Brand sentiment · By engine"
          >
            <SentimentSample fixture={fixture} />
          </Sample>
          <Sample
            id="members"
            note="Settings → Members, the real pane. Members and invitations come from the seeded query cache."
            title="Settings · Members"
          >
            <div className="bg-card max-w-[40rem] rounded-3xl border p-5 text-sm">
              <MembersSettingsPane />
            </div>
          </Sample>
          <Sample
            id="org-selector"
            note={`Sidebar footer at the narrowest resizable width (${SIDEBAR_MIN_WIDTH}px). Click it to open the switcher.`}
            title="Sidebar · Organization selector"
          >
            <SidebarProvider className="min-h-0!" defaultOpen>
              <FeedbackProvider>
                {/* w-60 matches SIDEBAR_MIN_WIDTH. */}
                <div className="bg-sidebar text-sidebar-foreground w-60 rounded-xl border">
                  <SidebarFooter>
                    <OrgSelector />
                  </SidebarFooter>
                </div>
              </FeedbackProvider>
            </SidebarProvider>
          </Sample>
          <Sample
            id="content-list"
            note="Content page, list view. Collections fixture with server pagination."
            title="Content · List"
          >
            <CollectionsSample fixture={fixture} view="list" />
          </Sample>
          <Sample
            id="content-grid"
            note="Content page, grid view."
            title="Content · Grid"
          >
            <CollectionsSample fixture={fixture} view="grid" />
          </Sample>
        </div>
      </OrganizationsProvider>
    </QueryClientProvider>
  );
}

export default function BreakUiDesignSystemClientPage() {
  // Fixture dates are relative to page load, so skip SSR to avoid hydration drift.
  const isClient = useIsClient();
  const [dataset, setDataset] = useQueryState("data", datasetParser);
  return (
    <DesignSystemFrame
      description="High-traffic surfaces rendered from fixtures. Flip the toggle at the bottom between demo data, the realistic worst case, empty, a single item, and 1,284 rows."
      title="Break UI"
    >
      {isClient ? (
        <>
          <BreakUiSamples dataset={dataset} key={dataset} />
          <DatasetToggle onChange={setDataset} value={dataset} />
        </>
      ) : null}
    </DesignSystemFrame>
  );
}
