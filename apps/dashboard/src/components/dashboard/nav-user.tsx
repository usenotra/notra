"use client";

import { Logout01Icon, User02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { authClient } from "@/lib/auth/client";
import { useHidePersonalData } from "@/lib/hooks/use-privacy-preferences";
import { cn } from "@/lib/utils";
import { getUserAvatarUrl } from "@/utils/avatar";

const emptySubscribe = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function NavUser() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const hasHydrated = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  );
  const { activeOrganization } = useOrganizationsContext();
  const { hidePersonalData } = useHidePersonalData();

  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const slug = activeOrganization?.slug ?? "";

  async function handleSignOut() {
    setIsSigningOut(true);
    trackEvent(POSTHOG_EVENTS.LOGOUT);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("Signed out successfully");
            router.push("/login");
          },
        },
      });
    } catch (_error) {
      toast.error("Failed to sign out");
      setIsSigningOut(false);
    }
  }

  if (!hasHydrated || (!user && isPending)) {
    return <Skeleton className="size-7 shrink-0 rounded-lg" />;
  }

  if (!user) {
    return null;
  }

  const userInitial = user.name.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            aria-label="Account"
            className="ring-sidebar-ring data-popup-open:ring-sidebar-border/70 shrink-0 cursor-pointer rounded-lg outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 data-popup-open:ring-1"
            disabled={isSigningOut}
            type="button"
          >
            <Avatar className="size-7 rounded-lg after:rounded-lg">
              <AvatarImage
                alt={user.name}
                className="rounded-lg"
                src={getUserAvatarUrl(user.image, user.email)}
              />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground flex items-center justify-center rounded-lg text-[0.6875rem] leading-none font-medium">
                <span className="-translate-y-px">{userInitial}</span>
              </AvatarFallback>
            </Avatar>
          </button>
        }
      />
      <DropdownMenuContent
        align="end"
        className="min-w-56 rounded-lg"
        side="bottom"
        sideOffset={4}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="size-8 rounded-lg after:rounded-lg">
                <AvatarImage
                  alt={user.name}
                  className="rounded-lg"
                  src={getUserAvatarUrl(user.image, user.email)}
                />
                <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground flex items-center justify-center rounded-lg text-xs leading-none font-medium">
                  <span className="-translate-y-px">{userInitial}</span>
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span
                  className={cn(
                    "text-foreground duration-normal truncate font-medium transition-[filter]",
                    hidePersonalData && "hover:blur-0 blur-[5px] select-none"
                  )}
                >
                  {user.name}
                </span>
                <span
                  className={cn(
                    "text-muted-foreground duration-normal truncate text-xs transition-[filter]",
                    hidePersonalData && "hover:blur-0 blur-[5px] select-none"
                  )}
                >
                  {user.email}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => router.push(`/${slug}/settings/account`)}
          >
            <HugeiconsIcon icon={User02Icon} />
            Account
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          disabled={isSigningOut}
          onClick={handleSignOut}
          variant="destructive"
        >
          <HugeiconsIcon icon={Logout01Icon} />
          {isSigningOut ? "Signing out..." : "Log Out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
