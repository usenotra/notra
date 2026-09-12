"use client";

import {
  ArrowUp01Icon,
  Calendar03Icon,
  Message01Icon,
  Moon02Icon,
  PlusSignIcon,
  Settings01Icon,
  SparklesIcon,
  Sun03Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PAID_OR_LEGACY_PLAN_IDS } from "@notra/ai/billing/features";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Kbd, KbdGroup } from "@notra/ui/components/ui/kbd";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@notra/ui/components/ui/sidebar";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useIsApplePlatform } from "@notra/ui/hooks/use-is-apple-platform";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { CreditBalanceMenuItem } from "@/components/billing/credit-balance-button";
import { CreditTopupModal } from "@/components/billing/credit-topup-modal";
import { useFeedback } from "@/components/dashboard/feedback-context";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { authClient } from "@/lib/auth/client";
import { useBillingCustomer } from "@/lib/hooks/use-billing-customer";
import { useSettingsModal } from "@/lib/hooks/use-settings-modal";
import { cn, errorMessageOr } from "@/lib/utils";
import type { OrganizationOptionsListProps } from "@/types/dashboard";
import { planDisplayName } from "@/utils/billing-plans";
import { setLastVisitedOrganization } from "@/utils/cookies";
import { QUERY_KEYS } from "@/utils/query-keys";

import {
  type Organization,
  useOrganizationsContext,
} from "../providers/organization-provider";

const CreateOrgModal = dynamic(
  () =>
    import("./create-org-modal").then((mod) => ({
      default: mod.CreateOrgModal,
    })),
  { ssr: false }
);

function OverflowAwareText({
  text,
  className,
  thresholdMultiplier = 1,
}: {
  text?: string;
  className?: string;
  thresholdMultiplier?: number;
}) {
  const [shouldShowEllipsis, setShouldShowEllipsis] = useState(true);
  const textRef = useRef<HTMLSpanElement>(null);
  const ellipsisRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!text) {
      return;
    }

    const textElement = textRef.current;
    const ellipsisElement = ellipsisRef.current;

    if (!textElement || !ellipsisElement) {
      return;
    }

    const updateEllipsisState = () => {
      const overflowWidth = textElement.scrollWidth - textElement.clientWidth;
      const ellipsisWidth = ellipsisElement.offsetWidth * thresholdMultiplier;

      setShouldShowEllipsis(overflowWidth > ellipsisWidth);
    };

    updateEllipsisState();

    const resizeObserver = new ResizeObserver(updateEllipsisState);
    resizeObserver.observe(textElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [text, thresholdMultiplier]);

  return (
    <div className="relative min-w-0 flex-1">
      <span
        className={cn(
          "block min-w-0 overflow-hidden whitespace-nowrap",
          shouldShowEllipsis ? "text-ellipsis" : "",
          className
        )}
        ref={textRef}
      >
        {text}
      </span>
      <span
        aria-hidden
        className={cn("invisible absolute", className)}
        ref={ellipsisRef}
      >
        ...
      </span>
    </div>
  );
}

function OrgSelectorTrigger({
  isSwitching,
  activeOrganization,
  planBadge,
}: {
  isSwitching: boolean;
  activeOrganization: Organization | null;
  planBadge: string | null;
}) {
  return (
    <DropdownMenuTrigger
      render={
        <SidebarMenuButton
          className="data-popup-open:bg-sidebar-accent/90 data-popup-open:text-sidebar-accent-foreground data-popup-open:ring-sidebar-border/70 min-w-0 cursor-pointer data-popup-open:ring-1"
          disabled={isSwitching}
          size="lg"
          tooltip={`Organization | ${activeOrganization?.name}`}
        >
          <Avatar className="size-8 shrink-0 rounded-lg after:rounded-lg">
            <AvatarImage
              className="rounded-lg"
              src={activeOrganization?.logo || undefined}
            />
            <AvatarFallback className="bg-sidebar-accent rounded-lg">
              {activeOrganization?.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="duration-normal flex min-w-0 flex-1 items-center gap-2 text-left text-sm leading-tight transition-opacity ease-(--sidebar-ease) group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:delay-75 group-data-[state=expanded]:delay-150 motion-reduce:transition-none motion-reduce:delay-0">
            <OverflowAwareText
              className="text-sm font-medium"
              text={activeOrganization?.name}
            />
            {planBadge ? (
              <Badge
                className="bg-primary/10 text-primary shrink-0 font-semibold uppercase"
                size="sm"
              >
                {planBadge}
              </Badge>
            ) : null}
          </div>
          <HugeiconsIcon
            className="duration-normal ml-auto transition-opacity ease-(--sidebar-ease) group-data-[collapsible=icon]:hidden group-data-[state=expanded]:delay-150 motion-reduce:transition-none motion-reduce:delay-0"
            icon={ArrowUp01Icon}
          />
        </SidebarMenuButton>
      }
    />
  );
}

function OrgSelectorSkeleton({ isCollapsed }: { isCollapsed: boolean }) {
  if (isCollapsed) {
    return null;
  }

  return (
    <SidebarMenuButton disabled size="lg">
      <Skeleton className="size-8 rounded-lg" />
      <div className="flex flex-1 gap-2 text-left text-sm leading-tight">
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="ml-auto size-4" />
    </SidebarMenuButton>
  );
}

const ORG_MENU_ITEM_CLASS = "cursor-pointer py-1.5";

function OrganizationOptionsList({
  organizations,
  selectedOrganizationId,
  onSelect,
  onCreate,
  disabled = false,
}: OrganizationOptionsListProps) {
  if (!organizations.length) {
    return (
      <div className="text-muted-foreground px-2 py-4 text-center text-sm">
        No organizations found
      </div>
    );
  }

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>Organizations</DropdownMenuLabel>
      {organizations.map((org) => {
        const isSelected = selectedOrganizationId === org.id;
        return (
          <DropdownMenuItem
            aria-current={isSelected ? "true" : undefined}
            className={ORG_MENU_ITEM_CLASS}
            disabled={disabled}
            key={org.id}
            onClick={() => onSelect(org.id)}
          >
            <Avatar className="size-5 rounded-md after:rounded-md">
              <AvatarImage src={org.logo || undefined} />
              <AvatarFallback className="rounded-md text-[10px]">
                {org.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <OverflowAwareText
              className="text-sm"
              text={org.name}
              thresholdMultiplier={1.75}
            />
            {isSelected ? (
              <HugeiconsIcon
                className="text-muted-foreground ml-auto size-4"
                icon={Tick02Icon}
              />
            ) : null}
          </DropdownMenuItem>
        );
      })}
      {onCreate ? (
        <DropdownMenuItem
          className={cn(ORG_MENU_ITEM_CLASS, "text-muted-foreground")}
          disabled={disabled}
          onClick={onCreate}
        >
          <HugeiconsIcon icon={PlusSignIcon} />
          New organization
        </DropdownMenuItem>
      ) : null}
    </DropdownMenuGroup>
  );
}

export function OrgSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { isMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";
  let dropdownSide: "bottom" | "right" | "top" = "top";
  if (isMobile) {
    dropdownSide = "bottom";
  } else if (isCollapsed) {
    dropdownSide = "right";
  }
  const { setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");
  const { openFeedback } = useFeedback();
  const { openSettings } = useSettingsModal();
  const isApplePlatform = useIsApplePlatform();

  function triggerScheduleDemo() {
    const btn = document.querySelector<HTMLButtonElement>(
      '[data-cal-namespace="15min"]'
    );
    btn?.click();
  }
  const { activeOrganization, organizations, isLoading } =
    useOrganizationsContext();
  const { data: customer } = useBillingCustomer({
    expand: ["subscriptions.plan"],
  });

  useHotkey("D", toggleTheme);

  const [isPending, startTransition] = useTransition();
  const [isSwitching, setIsSwitching] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const isNavigating = isSwitching || isPending;

  const activeSubscription = customer?.subscriptions.find(
    (subscription) => !subscription.addOn && subscription.status === "active"
  );
  const activePlanId =
    activeSubscription?.plan?.id ?? activeSubscription?.planId;
  const hasActivePaidPlan =
    !!activePlanId && PAID_OR_LEGACY_PLAN_IDS.has(activePlanId);
  const planBadge = hasActivePaidPlan
    ? planDisplayName(activeSubscription?.plan?.name)
    : null;

  async function switchOrganization(org: Organization) {
    if (org.slug === activeOrganization?.slug) {
      return;
    }

    const currentSlug = activeOrganization?.slug;
    let targetPath = `/${org.slug}`;

    if (currentSlug && pathname) {
      const segments = pathname.split("/").filter(Boolean);
      if (segments[0] === currentSlug && segments.length > 1) {
        const subPath = `/${segments.slice(1).join("/")}`;
        targetPath = `/${org.slug}${subPath}`;
      }
    }

    router.prefetch(targetPath);
    setIsSwitching(true);

    try {
      const { error } = await authClient.organization.setActive({
        organizationId: org.id,
      });

      if (error) {
        const message = errorMessageOr(
          error.message,
          "Failed to switch organization"
        );
        toast.error(message);
        setIsSwitching(false);
        return;
      }

      await setLastVisitedOrganization(org.slug);
      trackEvent(POSTHOG_EVENTS.ORG_SWITCHED, {
        from_organization_id: activeOrganization?.id ?? null,
        to_organization_id: org.id,
        organization_count: organizations.length,
      });
      queryClient.invalidateQueries({ refetchType: "none" });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AUTH.activeOrganization,
        }),
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AUTH.session,
        }),
      ]);

      setIsSwitching(false);
      startTransition(() => {
        router.replace(targetPath);
      });
    } catch (error) {
      toast.error("Failed to switch organization");
      console.error(error);
      setIsSwitching(false);
    }
  }

  function handleCreateOrganization() {
    if (!hasActivePaidPlan) {
      toast("Subscribe to create more organizations", {
        action: {
          label: "Upgrade",
          onClick: () => openSettings("billing"),
        },
      });
      return;
    }
    setIsCreateModalOpen(true);
  }

  function handleSelectOrganization(organizationId: string) {
    const organization = organizations.find((org) => org.id === organizationId);
    if (organization) {
      switchOrganization(organization);
    }
  }

  const showSkeleton = !activeOrganization && isLoading;
  const shouldShowTrigger = Boolean(activeOrganization) && !showSkeleton;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          {shouldShowTrigger ? (
            <OrgSelectorTrigger
              activeOrganization={activeOrganization}
              isSwitching={isNavigating}
              planBadge={planBadge}
            />
          ) : (
            <OrgSelectorSkeleton isCollapsed={isCollapsed} />
          )}
          <DropdownMenuContent
            align="start"
            className="w-64"
            side={dropdownSide}
            sideOffset={6}
          >
            <OrganizationOptionsList
              disabled={isNavigating}
              onCreate={handleCreateOrganization}
              onSelect={handleSelectOrganization}
              organizations={organizations}
              selectedOrganizationId={activeOrganization?.id}
            />

            <DropdownMenuSeparator />

            <CreditBalanceMenuItem
              className={ORG_MENU_ITEM_CLASS}
              onOpenTopup={() => setIsTopupModalOpen(true)}
            />
            <DropdownMenuItem
              className={ORG_MENU_ITEM_CLASS}
              onClick={() => openFeedback()}
            >
              <HugeiconsIcon icon={Message01Icon} />
              Feedback
              <Kbd className="ml-auto">F</Kbd>
            </DropdownMenuItem>
            <DropdownMenuItem
              className={ORG_MENU_ITEM_CLASS}
              onClick={triggerScheduleDemo}
            >
              <HugeiconsIcon icon={Calendar03Icon} />
              Schedule a Demo
              <Kbd className="ml-auto">S</Kbd>
            </DropdownMenuItem>
            {hasActivePaidPlan ? null : (
              <DropdownMenuItem
                className={cn(
                  ORG_MENU_ITEM_CLASS,
                  "text-primary focus:text-primary [&_svg]:text-primary"
                )}
                onClick={() => openSettings("billing")}
              >
                <HugeiconsIcon icon={SparklesIcon} />
                Upgrade to Growth
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className={ORG_MENU_ITEM_CLASS}
              onClick={() => openSettings("account")}
            >
              <HugeiconsIcon icon={Settings01Icon} />
              Settings
              <KbdGroup className="ml-auto">
                <Kbd>{isApplePlatform ? "⌘" : "Ctrl"}</Kbd>
                <Kbd>,</Kbd>
              </KbdGroup>
            </DropdownMenuItem>

            <DropdownMenuItem
              className={ORG_MENU_ITEM_CLASS}
              onClick={toggleTheme}
            >
              <HugeiconsIcon icon={isDark ? Sun03Icon : Moon02Icon} />
              {isDark ? "Light Mode" : "Dark Mode"}
              <Kbd className="ml-auto">D</Kbd>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <CreateOrgModal
          onOpenChange={setIsCreateModalOpen}
          open={isCreateModalOpen}
        />

        <CreditTopupModal
          onOpenChange={setIsTopupModalOpen}
          open={isTopupModalOpen}
        />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
