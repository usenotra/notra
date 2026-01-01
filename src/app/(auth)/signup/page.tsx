"use client";

import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { AnyFieldApi } from "@tanstack/react-form";
import { useForm } from "@tanstack/react-form";
import { useAtom } from "jotai";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Github } from "@/components/ui/svgs/github";
import { Google } from "@/components/ui/svgs/google";
import { authClient } from "@/lib/auth/client";
import { isAuthLoadingAtom } from "@/utils/atoms/auth";

function FieldInfo({ field }: { field: AnyFieldApi }) {
  const hasError = field.state.meta.isTouched && !field.state.meta.isValid;
  const isValidating = field.state.meta.isValidating;
  const errorMessage = field.state.meta.errors[0];

  if (!(hasError || isValidating)) {
    return <div className="min-h-[16px]" />;
  }

  let errorText: string | null = null;
  if (errorMessage) {
    if (typeof errorMessage === "string") {
      errorText = errorMessage;
    } else {
      errorText = String(errorMessage);
    }
  }

  return (
    <div className="min-h-[16px]">
      {errorText ? (
        <em className="text-destructive text-xs" role="alert">
          {errorText}
        </em>
      ) : null}
      {isValidating ? (
        <span className="text-muted-foreground text-xs">Validating...</span>
      ) : null}
    </div>
  );
}

export default function SignUp() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useAtom(isAuthLoadingAtom);

  async function handleSocialSignup(provider: "google" | "github") {
    if (isAuthLoading) { return; }

    setIsAuthLoading(true);
    await authClient.signIn.social({
      provider,
      callbackURL: "/callback",
    });
  }

  const form = useForm({
    defaultValues: { email: "", password: "" },
    onSubmit: async ({ value }) => {
      if (isAuthLoading) { return; }

      setIsAuthLoading(true);
      const result = await authClient.signUp.email({
        email: value.email,
        password: value.password,
        name: value.email.split("@")[0] || "User",
      });

      if (result.error) {
        setIsAuthLoading(false);
        return;
      }

      router.push("/callback");
    },
  });

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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="grid gap-3">
            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) => {
                  const result = z
                    .string()
                    .min(1, "Email is required")
                    .email("Please enter a valid email address")
                    .safeParse(value);
                  if (!result.success) {
                    return result.error.issues[0]?.message ?? "Invalid email";
                  }
                  return;
                },
                onChangeAsyncDebounceMs: 500,
              }}
            >
              {(field) => (
                <div className="grid gap-1">
                  <Label className="sr-only" htmlFor={field.name}>
                    Email
                  </Label>
                  <Input
                    disabled={isAuthLoading}
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Email"
                    type="email"
                    value={field.state.value}
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            </form.Field>
            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) => {
                  const result = z
                    .string()
                    .min(1, "Password is required")
                    .min(8, "Password must be at least 8 characters")
                    .safeParse(value);
                  if (!result.success) {
                    return (
                      result.error.issues[0]?.message ?? "Invalid password"
                    );
                  }
                  return;
                },
                onChangeAsyncDebounceMs: 500,
              }}
            >
              {(field) => (
                <div className="grid gap-1">
                  <Label className="sr-only" htmlFor={field.name}>
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      className="pr-9"
                      disabled={isAuthLoading}
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Password"
                      type={showPassword ? "text" : "password"}
                      value={field.state.value}
                    />
                    <button
                      className="absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                      disabled={isAuthLoading}
                      onClick={() => setShowPassword(!showPassword)}
                      type="button"
                    >
                      {showPassword ? (
                        <HugeiconsIcon
                          className="size-4"
                          icon={ViewOffSlashIcon}
                        />
                      ) : (
                        <HugeiconsIcon className="size-4" icon={ViewIcon} />
                      )}
                    </button>
                  </div>
                  <FieldInfo field={field} />
                </div>
              )}
            </form.Field>
          </div>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                className="mt-4 w-full"
                disabled={!canSubmit || isAuthLoading}
                type="submit"
              >
                {isSubmitting || isAuthLoading ? "..." : "Continue"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </div>

      <div className="flex flex-col gap-4 px-8 text-center text-muted-foreground text-xs">
        <p>
          Forgot your password?{" "}
          <Link
            className="underline underline-offset-4 hover:text-primary"
            href="/reset-password"
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
