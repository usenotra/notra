"use client";

import { Delete02Icon, Logout01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@notra/ui/components/shared/responsive-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { authClient } from "@/lib/auth/client";
import { getUserAvatarUrl } from "@/utils/avatar";

export function OnboardingAccountMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const signOut = authClient.useSignOut();
  const user = session?.user;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("Signed out successfully");
            router.push("/login");
          },
        },
      });
    } catch {
      toast.error("Failed to sign out");
      setIsSigningOut(false);
    }
  }

  function handleOpenDelete() {
    setIsMenuOpen(false);
    setIsDeleteOpen(true);
  }

  if (isPending) {
    return <Skeleton className="size-9 rounded-full" />;
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <ResponsiveDialog onOpenChange={setIsMenuOpen} open={isMenuOpen}>
        <ResponsiveDialogTrigger
          render={
            <Button
              aria-label="Account menu"
              className="size-9 rounded-full p-0"
              variant="ghost"
            >
              <Avatar className="size-9 rounded-full after:rounded-full">
                <AvatarImage
                  alt={user.name}
                  className="rounded-full"
                  src={getUserAvatarUrl(user.image, user.email)}
                />
                <AvatarFallback className="rounded-full text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          }
        />
        <ResponsiveDialogContent className="max-w-sm">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Account</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Manage your session before choosing a plan.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Avatar className="size-10 rounded-lg after:rounded-lg">
                <AvatarImage
                  alt={user.name}
                  className="rounded-lg"
                  src={getUserAvatarUrl(user.image, user.email)}
                />
                <AvatarFallback className="rounded-lg">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                className="w-full justify-start"
                disabled={isSigningOut}
                onClick={handleSignOut}
                variant="outline"
              >
                {isSigningOut ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <HugeiconsIcon icon={Logout01Icon} size={16} />
                )}
                {isSigningOut ? "Signing out..." : "Log out"}
              </Button>
              <Button
                className="w-full justify-start"
                onClick={handleOpenDelete}
                variant="outline"
              >
                <HugeiconsIcon icon={Delete02Icon} size={16} />
                Delete account
              </Button>
            </div>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <DeleteAccountDialog onOpenChange={setIsDeleteOpen} open={isDeleteOpen} />
    </>
  );
}
