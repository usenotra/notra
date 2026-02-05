"use client";

import {
  Logout01Icon,
  MoreVerticalCircle01Icon,
  User02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@notra/ui/components/ui/sidebar";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

export function NavUser() {
  const router = useRouter();
  const { isMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { activeOrganization } = useOrganizationsContext();

  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const slug = activeOrganization?.slug ?? "";

  useEffect(() => {
    if (!(user || isPending || isRedirecting)) {
      setIsRedirecting(true);
      router.push("/login");
    }
  }, [user, isPending, isRedirecting, router]);

  async function handleSignOut() {
    setIsSigningOut(true);
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

  if (!user && isPending) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton disabled size="lg" tooltip={"Account"}>
            <Skeleton className="size-8 rounded-lg" />
            {!isCollapsed && (
              <>
                <div className="grid flex-1 gap-1 text-left text-sm leading-tight">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="ml-auto size-4" />
              </>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className={cn(
                  "cursor-pointer data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                  isCollapsed ? "size-10 min-w-0 justify-center p-1" : ""
                )}
                disabled={isSigningOut}
                size="lg"
                tooltip={"Account"}
              >
                <Avatar
                  className={cn(
                    "size-8 rounded-lg after:rounded-lg",
                    isCollapsed ? "size-6.5" : ""
                  )}
                >
                  <AvatarImage
                    alt={user.name}
                    className="rounded-lg"
                    src={user.image ?? undefined}
                  />
                  <AvatarFallback className="rounded-lg">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user.name}</span>
                      <span className="truncate text-muted-background text-xs">
                        {user.email}
                      </span>
                    </div>
                    <HugeiconsIcon
                      className="ml-auto size-4"
                      icon={MoreVerticalCircle01Icon}
                    />
                  </>
                )}
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent
            align="end"
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-lg after:rounded-lg">
                    <AvatarImage
                      alt={user.name}
                      className="rounded-lg"
                      src={user.image ?? undefined}
                    />
                    <AvatarFallback className="rounded-lg">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium text-foreground">
                      {user.name}
                    </span>
                    <span className="truncate text-muted-foreground text-xs">
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
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
