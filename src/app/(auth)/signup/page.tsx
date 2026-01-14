"use client";

import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Github } from "@/components/ui/svgs/github";
import { Google } from "@/components/ui/svgs/google";
import { authClient } from "@/lib/auth/client";

const signupSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

export default function SignUp() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  async function handleSocialSignup(provider: "google" | "github") {
    if (isAuthLoading) {
      return;
    }

    setIsAuthLoading(true);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: "/callback",
      });
    } catch (error) {
      console.error("Social signup error:", error);
      toast.error("Failed to sign up. Please try again.");
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleEmailSignup(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (isAuthLoading) {
      return;
    }

    const validation = signupSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setIsAuthLoading(true);
    const result = await authClient.signUp.email({
      email,
      password,
      name: email.split("@")[0] || "User",
    });

    if (result.error) {
      toast.error(
        result.error.message ?? "Failed to sign up. Please try again."
      );
      setIsAuthLoading(false);
      return;
    }

    router.push("/callback");
  }

  return (
    <div className="mx-auto flex min-w-[300px] flex-col gap-8 rounded-md p-6 lg:w-[384px] lg:px-8 lg:py-10">
      <div className="text-center">
        <h1 className="font-semibold text-xl lg:text-2xl">Create an account</h1>
        <p className="text-muted-foreground text-sm">
          Please create an account to continue.
        </p>
      </div>

      <div className="grid gap-6">
        <div className="grid grid-cols-2 gap-4">
          <Button
            className="w-full"
            disabled={isAuthLoading}
            onClick={() => handleSocialSignup("google")}
            type="button"
            variant="outline"
          >
            <Google className="mr-2 size-4" />
            Google
          </Button>
          <Button
            className="w-full"
            disabled={isAuthLoading}
            onClick={() => handleSocialSignup("github")}
            type="button"
            variant="outline"
          >
            <Github className="mr-2 size-4" />
            GitHub
          </Button>
        </div>

        <div className="relative flex items-center">
          <span className="inline-block h-px w-full border-t bg-border" />
          <span className="shrink-0 px-2 text-muted-foreground text-xs uppercase">
            Or
          </span>
          <span className="inline-block h-px w-full border-t bg-border" />
        </div>

        <form action={handleEmailSignup}>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label className="sr-only" htmlFor="email">
                Email
              </Label>
              <Input
                disabled={isAuthLoading}
                id="email"
                name="email"
                placeholder="Email"
                type="email"
              />
            </div>
            <div className="grid gap-1">
              <Label className="sr-only" htmlFor="password">
                Password
              </Label>
              <div className="relative">
                <Input
                  className="pr-9"
                  disabled={isAuthLoading}
                  id="password"
                  name="password"
                  placeholder="Password"
                  type={showPassword ? "text" : "password"}
                />
                <button
                  className="absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  disabled={isAuthLoading}
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
          </div>
          <Button
            className="mt-4 w-full"
            disabled={isAuthLoading}
            type="submit"
          >
            {isAuthLoading ? "..." : "Continue"}
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-4 px-8 text-center text-muted-foreground text-xs">
        <p>
          Forgot your password?{" "}
          <Link
            className="underline underline-offset-4 hover:text-primary"
            href="/forgot-password"
          >
            Reset Your Password
          </Link>
        </p>
        <Separator />
        <p>
          Already have an account?{" "}
          <Link
            className="underline underline-offset-4 hover:text-primary"
            href="/login"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
