"use client";

import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

export default function ResetPassword() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!(password && confirmPassword) || isLoading) {
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    setIsLoading(false);

    if (result.error) {
      if (result.error.message?.includes("expired")) {
        toast.error("This reset link has expired. Please request a new one.");
      } else if (result.error.message?.includes("invalid")) {
        toast.error("This reset link is invalid. Please request a new one.");
      } else {
        toast.error(
          result.error.message ?? "Something went wrong. Please try again."
        );
      }
      return;
    }

    toast.success("Password reset successfully! Please log in.");
    router.push("/login");
  }

  return (
    <div className="mx-auto flex min-w-[300px] flex-col gap-8 rounded-md p-6 lg:w-[384px] lg:px-8 lg:py-10">
      <div className="text-center">
        <h1 className="font-semibold text-xl lg:text-2xl">Set new password</h1>
        <p className="text-muted-foreground text-sm">
          Enter your new password below.
        </p>
      </div>

      <form action={handleSubmit}>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="password">
              New Password
            </Label>
            <div className="relative">
              <Input
                className="pr-9"
                disabled={isLoading}
                id="password"
                minLength={8}
                name="password"
                placeholder="New password"
                required
                type={showPassword ? "text" : "password"}
              />
              <button
                className="absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                disabled={isLoading}
                onClick={() => setShowPassword(!showPassword)}
                type="button"
              >
                {showPassword ? (
                  <HugeiconsIcon className="size-4" icon={ViewOffSlashIcon} />
                ) : (
                  <HugeiconsIcon className="size-4" icon={ViewIcon} />
                )}
              </button>
            </div>
          </div>
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="confirmPassword">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                className="pr-9"
                disabled={isLoading}
                id="confirmPassword"
                minLength={8}
                name="confirmPassword"
                placeholder="Confirm new password"
                required
                type={showConfirmPassword ? "text" : "password"}
              />
              <button
                className="absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                disabled={isLoading}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                type="button"
              >
                {showConfirmPassword ? (
                  <HugeiconsIcon className="size-4" icon={ViewOffSlashIcon} />
                ) : (
                  <HugeiconsIcon className="size-4" icon={ViewIcon} />
                )}
              </button>
            </div>
          </div>
        </div>
        <p className="mt-2 text-muted-foreground text-xs">
          Password must be at least 8 characters long.
        </p>
        <Button className="mt-4 w-full" disabled={isLoading} type="submit">
          {isLoading ? "..." : "Reset password"}
        </Button>
      </form>

      <div className="px-8 text-center text-muted-foreground text-xs">
        <Link
          className="underline underline-offset-4 hover:text-primary"
          href="/login"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
