"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    if (!email || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });

      if (result.error) {
        toast.error("Something went wrong. Please try again.");
        return;
      }

      setIsSubmitted(true);
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="mx-auto flex min-w-[300px] flex-col gap-8 rounded-md p-6 lg:w-[384px] lg:px-8 lg:py-10">
        <div className="text-center">
          <h1 className="font-semibold text-xl lg:text-2xl">
            Check your email
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            If an account exists with that email, we&apos;ve sent you a link to
            reset your password.
          </p>
        </div>

        <div className="flex flex-col gap-4 text-center">
          <p className="text-muted-foreground text-sm">
            Didn&apos;t receive an email? Check your spam folder or try again.
          </p>
          <Button
            onClick={() => setIsSubmitted(false)}
            type="button"
            variant="outline"
          >
            Try again
          </Button>
        </div>

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

  return (
    <div className="mx-auto flex min-w-[300px] flex-col gap-8 rounded-md p-6 lg:w-[384px] lg:px-8 lg:py-10">
      <div className="text-center">
        <h1 className="font-semibold text-xl lg:text-2xl">
          Forgot your password?
        </h1>
        <p className="text-muted-foreground text-sm">
          Enter your email and we&apos;ll send you a link to reset your
          password.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">
              Email
            </Label>
            <Input
              disabled={isLoading}
              id="email"
              name="email"
              placeholder="Email"
              required
              type="email"
            />
          </div>
        </div>
        <Button className="mt-4 w-full" disabled={isLoading} type="submit">
          {isLoading ? "..." : "Send reset link"}
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
