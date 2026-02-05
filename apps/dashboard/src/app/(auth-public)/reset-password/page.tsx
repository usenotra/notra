"use client";

import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (error === "INVALID_TOKEN") {
    return (
      <div className="mx-auto flex min-w-[300px] flex-col gap-8 rounded-md p-6 lg:w-[384px] lg:px-8 lg:py-10">
        <div className="text-center">
          <h1 className="font-semibold text-xl lg:text-2xl">Invalid link</h1>
          <p className="text-muted-foreground text-sm">
            This password reset link is invalid or has expired.
          </p>
        </div>
        <Link href="/forgot-password">
          <Button className="w-full">Request a new link</Button>
        </Link>
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

  if (!token) {
    return (
      <div className="mx-auto flex min-w-[300px] flex-col gap-8 rounded-md p-6 lg:w-[384px] lg:px-8 lg:py-10">
        <div className="text-center">
          <h1 className="font-semibold text-xl lg:text-2xl">Missing token</h1>
          <p className="text-muted-foreground text-sm">
            No reset token found. Please use the link from your email.
          </p>
        </div>
        <Link href="/forgot-password">
          <Button className="w-full">Request a new link</Button>
        </Link>
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!(password && confirmPassword) || isLoading || !token) {
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

    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });

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
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-w-[300px] flex-col gap-8 rounded-md p-6 lg:w-[384px] lg:px-8 lg:py-10">
      <div className="text-center">
        <h1 className="font-semibold text-xl lg:text-2xl">Set new password</h1>
        <p className="text-muted-foreground text-sm">
          Enter your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="password">
              New Password
            </Label>
            <div className="relative">
              <Input
                autoComplete="new-password"
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
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="-translate-y-1/2 absolute top-1/2 right-4 text-muted-foreground hover:text-foreground disabled:opacity-50"
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
                autoComplete="new-password"
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
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                className="-translate-y-1/2 absolute top-1/2 right-4 text-muted-foreground hover:text-foreground disabled:opacity-50"
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
          {isLoading ? "Resetting…" : "Reset Password"}
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

export default function ResetPassword() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-w-[300px] flex-col gap-8 rounded-md p-6 lg:w-[384px] lg:px-8 lg:py-10">
          <div className="text-center">
            <h1 className="font-semibold text-xl lg:text-2xl">Loading…</h1>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
