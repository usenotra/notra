"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Label } from "@notra/ui/components/ui/label";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useMutation } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { authClient } from "@/lib/auth/client";
import { errorMessageOr } from "@/lib/utils";
import type { LoginDetailsSectionProps } from "@/types/settings/account";

export function LoginDetailsSection({
  email,
  hasPasswordAccount,
}: LoginDetailsSectionProps) {
  // react-doctor-disable-next-line query-mutation-missing-invalidation
  const passwordResetMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.requestPasswordReset();

      if (result.error) {
        throw new Error(
          errorMessageOr(
            result.error.message,
            "Failed to send password reset email"
          )
        );
      }

      return result.data;
    },
    onSuccess: () => {
      toast.success("Password reset email sent");
    },
    onError: (error) => {
      toast.error(
        errorMessageOr(error.message, "Failed to send password reset email")
      );
    },
  });

  return (
    <TitleCard heading="Login Details">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Email</Label>
          <div className="flex items-center gap-2">
            <div className="bg-muted/50 flex-1 truncate rounded-lg border px-3 py-2 text-sm">
              {email}
            </div>
            <HugeiconsIcon
              className="text-success shrink-0"
              icon={CheckmarkCircle02Icon}
              size={20}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Your email is used to sign in and receive notifications
          </p>
        </div>

        {hasPasswordAccount && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium">Password</p>
            <p className="text-muted-foreground mt-1 text-xs">
              We will email you a link to reset your password.
            </p>
            <Button
              className="mt-4"
              disabled={passwordResetMutation.isPending}
              onClick={() => passwordResetMutation.mutate()}
            >
              {passwordResetMutation.isPending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send password reset email"
              )}
            </Button>
          </div>
        )}
      </div>
    </TitleCard>
  );
}
