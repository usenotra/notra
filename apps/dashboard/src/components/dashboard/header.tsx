import { ArrowRight01Icon, SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@notra/ui/components/ui/breadcrumb";
import { Kbd, KbdGroup } from "@notra/ui/components/ui/kbd";
import { Separator } from "@notra/ui/components/ui/separator";
import { useIsApplePlatform } from "@notra/ui/hooks/use-is-apple-platform";
import { cn } from "@notra/ui/lib/utils";
import { useHotkey } from "@tanstack/react-hotkeys";
import { parseAsString, useQueryState } from "nuqs";
import { useId } from "react";
import { useTranslations } from "use-intl";

import { useCommandPalette } from "@/components/command-palette/command-palette-context";
import { BrandTopbarIdentitySelector } from "@/components/dashboard/brand-topbar-identity-selector";
import { ChatTopbarTitle } from "@/components/dashboard/chat-topbar-title";
import { ContentTopbarTitle } from "@/components/dashboard/content-topbar-title";
import { DashboardAgentButton } from "@/components/dashboard/dashboard-agent-button";
import { useFeedback } from "@/components/dashboard/feedback-context";
import { FeedbackForm } from "@/components/dashboard/feedback-popover";
import { NavUser } from "@/components/dashboard/nav-user";
import { SidebarToggle } from "@/components/dashboard/sidebar-toggle";
import Link from "@/components/framework/link";
import {
  DeploymentTopbarTitle,
  SiteSectionTopbarTitle,
  SiteTopbarTitle,
} from "@/components/sites/site-topbar-title";
import { SITE_SECTIONS } from "@/constants/sites";
import { useBreadcrumbLabels } from "@/lib/hooks/use-breadcrumb-labels";
import { useGeoProjectQueryState } from "@/lib/hooks/use-geo-project-query";
import { useNavVisibility } from "@/lib/hooks/use-nav-visibility";
import { useSettingsModal } from "@/lib/hooks/use-settings-modal";
import { usePathname } from "@/lib/navigation";
import type { BreadcrumbLabels } from "@/types/dashboard/breadcrumbs";
import {
  fallbackSegmentLabel,
  isBreadcrumbSegment,
  isGeoBreadcrumbSegment,
} from "@/utils/dashboard-breadcrumbs";
import { withGeoProject } from "@/utils/geo-paths";
import { toGeoTab } from "@/utils/geo-tabs";
import { scheduleDemo } from "@/utils/schedule-demo";
import { siteHref } from "@/utils/site-links";

const NON_ORG_PATHS: string[] = [];

const NON_CLICKABLE_SEGMENTS: ReadonlySet<string> = new Set([
  "automation",
  "brand",
]);

export function SiteHeader() {
  const t = useTranslations("dashboard.header");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const slug = segments[0];
  const {
    open: feedbackOpen,
    setOpen: setFeedbackOpen,
    openFeedback,
  } = useFeedback();
  const { setOpen: setCommandPaletteOpen } = useCommandPalette();
  const {
    isOpen: settingsOpen,
    openSettings,
    closeSettings,
  } = useSettingsModal();
  const isApplePlatform = useIsApplePlatform();

  useHotkey("Mod+,", (event) => {
    event.preventDefault();
    if (!slug) {
      return;
    }

    if (settingsOpen) {
      closeSettings();
      return;
    }

    openSettings("account");
  });

  useHotkey("F", () => {
    openFeedback();
  });

  useHotkey("S", () => {
    void scheduleDemo();
  });

  return (
    <header className="@container/topbar relative flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="grid h-full w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1 px-4 lg:gap-2 lg:px-6 @4xl/topbar:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="flex min-w-0 items-center gap-1 overflow-hidden lg:gap-2">
          <SidebarToggle className="-ml-1" />
          <Separator
            className="mx-2 h-4 self-center data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
            orientation="vertical"
          />
          <DashboardHeaderBreadcrumbs />
        </div>
        <button
          aria-label={tCommon("actions.search")}
          className="text-muted-foreground hover:bg-muted/50 @container/search hidden h-8 w-48 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-transparent px-2 text-sm transition-colors @[8rem]/search:justify-start @[8rem]/search:px-3 @4xl/topbar:flex @5xl/topbar:w-64 @6xl/topbar:w-80"
          onClick={() => setCommandPaletteOpen(true)}
          type="button"
        >
          <HugeiconsIcon className="shrink-0" icon={SearchIcon} size={16} />
          <span className="hidden min-w-0 flex-1 truncate text-left @[8rem]/search:block">
            {tCommon("actions.search")}
          </span>
          <KbdGroup className="hidden shrink-0 @[14rem]/search:flex">
            <Kbd>{isApplePlatform ? "⌘" : "Ctrl"}</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </button>
        <div className="flex h-full min-w-0 items-center justify-end gap-1 sm:gap-2">
          <div className="flex shrink-0 items-center gap-1">
            <button
              aria-label={tCommon("actions.search")}
              className="text-muted-foreground hover:bg-muted/50 hover:text-foreground inline-flex size-7 items-center justify-center rounded-lg @4xl/topbar:hidden"
              onClick={() => setCommandPaletteOpen(true)}
              type="button"
            >
              <HugeiconsIcon icon={SearchIcon} size={14} strokeWidth={1.8} />
            </button>
            <DashboardAgentButton />
          </div>
          <button
            aria-hidden
            className="hidden"
            data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
            data-cal-link="dominikkoch/15min"
            data-cal-namespace="15min"
            tabIndex={-1}
            type="button"
          />
          <NavUser />
          <ResponsiveDialog onOpenChange={setFeedbackOpen} open={feedbackOpen}>
            <ResponsiveDialogContent
              className="gap-0 p-0 sm:max-w-md"
              showCloseButton={false}
            >
              <ResponsiveDialogHeader className="sr-only">
                <ResponsiveDialogTitle>
                  {tCommon("labels.sendFeedback")}
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  {t("feedbackDescription")}
                </ResponsiveDialogDescription>
              </ResponsiveDialogHeader>
              {feedbackOpen ? (
                <FeedbackForm
                  autoFocus={false}
                  onSubmitted={() => setFeedbackOpen(false)}
                />
              ) : null}
            </ResponsiveDialogContent>
          </ResponsiveDialog>
        </div>
      </div>
    </header>
  );
}

function DashboardHeaderBreadcrumbs() {
  const pathname = usePathname();
  const [geoTabParam] = useQueryState("tab", parseAsString);
  const [geoProjectParam] = useGeoProjectQueryState();
  const id = useId();
  const labels = useBreadcrumbLabels();
  const visibility = useNavVisibility();
  const tUi = useTranslations("ui");

  return (
    <Breadcrumb aria-label={tUi("breadcrumb")} className="min-w-0">
      <BreadcrumbList className="text-foreground min-w-0 flex-nowrap gap-2 text-sm font-medium">
        {headerBreadcrumbItems(
          pathname,
          geoTabParam,
          geoProjectParam,
          id,
          labels,
          visibility.sites
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function headerBreadcrumbItems(
  pathname: string,
  geoTabParam: string | null,
  geoProjectParam: string | null,
  id: string,
  labels: BreadcrumbLabels,
  sitesEnabled: boolean
) {
  const segments = pathname.split("/").filter(Boolean);
  const slug = segments[0];
  const isNonOrgPath = NON_ORG_PATHS.some((path) => pathname.startsWith(path));
  const breadcrumbSegments = isNonOrgPath ? segments : segments.slice(1);
  if (!sitesEnabled && breadcrumbSegments[0] === "sites") {
    return [];
  }
  const isChatDetail =
    !isNonOrgPath &&
    breadcrumbSegments[0] === "chat" &&
    breadcrumbSegments.length >= 2;
  const chatDetailId = isChatDetail ? (breadcrumbSegments[1] ?? null) : null;
  const isCollectionDetail =
    !isNonOrgPath &&
    breadcrumbSegments[0] === "collection" &&
    breadcrumbSegments.length >= 2;
  const isContentDetail =
    !isNonOrgPath &&
    breadcrumbSegments[0] === "content" &&
    breadcrumbSegments.length >= 2;
  const contentDetailId = isContentDetail
    ? (breadcrumbSegments[1] ?? null)
    : null;
  const isBrandIdentity =
    !isNonOrgPath &&
    breadcrumbSegments[0] === "brand" &&
    breadcrumbSegments[1] === "identity";
  const isGeo = !isNonOrgPath && breadcrumbSegments[0] === "geo";
  const isSiteDetail =
    !isNonOrgPath &&
    breadcrumbSegments[0] === "sites" &&
    (breadcrumbSegments[1]?.startsWith("site_") ?? false);

  if (isBrandIdentity) {
    return brandIdentityHeaderBreadcrumbs(id, slug, labels);
  }
  if (isSiteDetail) {
    return sitesHeaderBreadcrumbs(breadcrumbSegments, id, slug, labels);
  }
  if (isGeo) {
    return geoHeaderBreadcrumbs({
      breadcrumbSegments,
      geoProjectId: geoProjectParam ?? undefined,
      geoTabParam,
      id,
      segments,
      slug,
      labels,
    });
  }
  return genericHeaderBreadcrumbs({
    breadcrumbSegments,
    chatDetailId,
    contentDetailId,
    id,
    isChatDetail,
    isCollectionDetail,
    isContentDetail,
    isNonOrgPath,
    segments,
    slug,
    labels,
  });
}

function brandIdentityHeaderBreadcrumbs(
  id: string,
  slug: string | undefined,
  labels: BreadcrumbLabels
) {
  return [
    <BreadcrumbItem
      className="shrink-0 whitespace-nowrap hover:underline"
      key={`${id}-brand-identity-link`}
    >
      <BreadcrumbLink
        render={
          <Link href={`/${slug}/brand/identity`}>
            {labels.segments.identity}
          </Link>
        }
      />
    </BreadcrumbItem>,
    <BreadcrumbSeparator key={`${id}-brand-identity-sep`}>
      <HugeiconsIcon icon={ArrowRight01Icon} />
    </BreadcrumbSeparator>,
    <BreadcrumbItem className="min-w-0" key={`${id}-brand-identity-selector`}>
      <BrandTopbarIdentitySelector slug={slug ?? ""} />
    </BreadcrumbItem>,
  ];
}

function sitesHeaderBreadcrumbs(
  breadcrumbSegments: string[],
  id: string,
  slug: string | undefined,
  labels: BreadcrumbLabels
) {
  const siteId = breadcrumbSegments[1] ?? "";
  const section = SITE_SECTIONS.find(
    (item) => item.path === `/${breadcrumbSegments[2] ?? ""}`
  )?.section;
  const deploymentId =
    section === "deployments" ? breadcrumbSegments[3] : undefined;
  const siteSlug = slug ?? "";
  const separator = (key: string) => (
    <BreadcrumbSeparator key={`${id}-sites-sep-${key}`}>
      <HugeiconsIcon icon={ArrowRight01Icon} />
    </BreadcrumbSeparator>
  );
  return [
    <BreadcrumbItem
      className="shrink-0 hover:underline"
      key={`${id}-sites-root`}
    >
      <BreadcrumbLink
        render={<Link href={`/${slug}/sites`}>{labels.segments.sites}</Link>}
      />
    </BreadcrumbItem>,
    separator("site"),
    <BreadcrumbItem
      className={cn("min-w-0", section && "hover:underline")}
      key={`${id}-sites-site`}
    >
      <SiteTopbarTitle
        href={section ? siteHref(siteSlug, siteId) : null}
        siteId={siteId}
      />
    </BreadcrumbItem>,
    ...(section
      ? [
          <BreadcrumbSeparator
            className={cn(deploymentId && "max-sm:hidden")}
            key={`${id}-sites-sep-section`}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} />
          </BreadcrumbSeparator>,
          <BreadcrumbItem
            className={cn(
              "shrink-0",
              deploymentId && "hover:underline max-sm:hidden"
            )}
            key={`${id}-sites-section`}
          >
            <SiteSectionTopbarTitle
              href={deploymentId ? siteHref(siteSlug, siteId, section) : null}
              section={section}
            />
          </BreadcrumbItem>,
        ]
      : []),
    ...(deploymentId
      ? [
          separator("deployment"),
          <BreadcrumbItem className="min-w-0" key={`${id}-sites-deployment`}>
            <DeploymentTopbarTitle
              deploymentId={deploymentId}
              siteId={siteId}
            />
          </BreadcrumbItem>,
        ]
      : []),
  ];
}

function genericHeaderBreadcrumbs({
  breadcrumbSegments,
  chatDetailId,
  contentDetailId,
  id,
  isChatDetail,
  isCollectionDetail,
  isContentDetail,
  isNonOrgPath,
  segments,
  slug,
  labels,
}: {
  breadcrumbSegments: string[];
  chatDetailId: string | null;
  contentDetailId: string | null;
  id: string;
  isChatDetail: boolean;
  isCollectionDetail: boolean;
  isContentDetail: boolean;
  isNonOrgPath: boolean;
  segments: string[];
  slug: string | undefined;
  labels: BreadcrumbLabels;
}) {
  const displayBreadcrumbSegments = isCollectionDetail
    ? ["content", "collection"]
    : breadcrumbSegments;

  return displayBreadcrumbSegments.flatMap((segment, index) => {
    const href = (() => {
      if (isCollectionDetail && segment === "content") {
        return `/${slug}/content`;
      }
      if (isCollectionDetail && segment === "collection") {
        return `/${slug}/content`;
      }
      return isNonOrgPath
        ? `/${segments.slice(0, index + 1).join("/")}`
        : `/${segments.slice(0, index + 2).join("/")}`;
    })();
    const isLast = index === displayBreadcrumbSegments.length - 1;
    const label = isBreadcrumbSegment(segment)
      ? labels.segments[segment]
      : fallbackSegmentLabel(segment);
    const isClickable = !NON_CLICKABLE_SEGMENTS.has(segment);
    const isChatDetailLast = isChatDetail && isLast && chatDetailId;
    const isContentDetailLast = isContentDetail && isLast && contentDetailId;
    const content = (() => {
      if (isChatDetailLast) {
        return <ChatTopbarTitle chatId={chatDetailId} />;
      }

      if (isContentDetailLast) {
        return <ContentTopbarTitle contentId={contentDetailId} />;
      }

      if (isCollectionDetail && isLast) {
        return <BreadcrumbPage className="font-medium">{label}</BreadcrumbPage>;
      }

      if (isClickable) {
        return <BreadcrumbLink render={<Link href={href}>{label}</Link>} />;
      }

      if (isLast) {
        return <BreadcrumbPage className="font-medium">{label}</BreadcrumbPage>;
      }

      return <span>{label}</span>;
    })();

    const item = (
      <BreadcrumbItem
        className={cn(
          (isChatDetailLast || isContentDetailLast) && "min-w-0",
          isClickable &&
            !(isChatDetailLast || isCollectionDetail || isContentDetailLast) &&
            "hover:underline"
        )}
        key={`${id}-item-${segment}`}
      >
        {content}
      </BreadcrumbItem>
    );

    if (isLast) {
      return [item];
    }

    return [
      item,
      <BreadcrumbSeparator key={`${id}-separator-${segment}`}>
        <HugeiconsIcon icon={ArrowRight01Icon} />
      </BreadcrumbSeparator>,
    ];
  });
}

function geoHeaderBreadcrumbs({
  breadcrumbSegments,
  geoProjectId,
  geoTabParam,
  id,
  segments,
  slug,
  labels,
}: {
  breadcrumbSegments: string[];
  geoProjectId: string | undefined;
  geoTabParam: string | null;
  id: string;
  segments: string[];
  slug: string | undefined;
  labels: BreadcrumbLabels;
}) {
  const geoSectionSegments = breadcrumbSegments.slice(1);
  const geoTabLabel = labels.geoTabs[toGeoTab(geoTabParam)];

  const geoSectionBreadcrumbs =
    geoSectionSegments.length > 0
      ? geoSectionSegments.flatMap((segment, index) => {
          const isLast = index === geoSectionSegments.length - 1;
          const href = withGeoProject(
            `/${segments.slice(0, index + 3).join("/")}`,
            geoProjectId
          );
          const label = isGeoBreadcrumbSegment(segment)
            ? labels.geoSegments[segment]
            : fallbackSegmentLabel(segment);
          return [
            <BreadcrumbSeparator key={`${id}-geo-sep-${segment}`}>
              <HugeiconsIcon icon={ArrowRight01Icon} />
            </BreadcrumbSeparator>,
            <BreadcrumbItem
              className={cn(isLast && "min-w-0", !isLast && "hover:underline")}
              key={`${id}-geo-item-${segment}`}
            >
              {isLast ? (
                <BreadcrumbPage className="block truncate font-medium">
                  {label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link href={href}>{label}</Link>} />
              )}
            </BreadcrumbItem>,
          ];
        })
      : [
          <BreadcrumbSeparator key={`${id}-geo-tab-sep`}>
            <HugeiconsIcon icon={ArrowRight01Icon} />
          </BreadcrumbSeparator>,
          <BreadcrumbItem className="min-w-0" key={`${id}-geo-tab`}>
            <BreadcrumbPage className="block truncate font-medium">
              {geoTabLabel}
            </BreadcrumbPage>
          </BreadcrumbItem>,
        ];

  return [
    <BreadcrumbItem className="hover:underline" key={`${id}-geo-link`}>
      <BreadcrumbLink
        render={
          <Link href={withGeoProject(`/${slug}/geo`, geoProjectId)}>
            {labels.geo}
          </Link>
        }
      />
    </BreadcrumbItem>,
    ...geoSectionBreadcrumbs,
  ];
}
