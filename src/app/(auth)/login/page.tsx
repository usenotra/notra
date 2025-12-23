"use client";

import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Github } from "@/components/ui/svgs/github";
import { Google } from "@/components/ui/svgs/google";
import { authClient } from "@/lib/auth/client";
import { handleSocialAuth } from "@/lib/auth/functions";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const lastMethod = authClient.getLastUsedLoginMethod();

  return (
    <div className="mx-auto flex min-w-[300px] flex-col gap-8 rounded-md p-6 lg:w-[384px] lg:px-8 lg:py-10">
      <div className="text-center">
        <h1 className="font-semibold text-xl lg:text-2xl">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          Please log in to continue.
        </p>
      </div>

      <div className="grid gap-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            {lastMethod === "google" && (
              <Badge
                className="-right-2 -top-4 absolute z-10"
                variant="default"
              >
                Last Used
              </Badge>
            )}
            <Button
              className="w-full"
              onClick={() => handleSocialAuth({ provider: "google" })}
              type="button"
              variant="outline"
            >
              <Google className="mr-2 size-4" />
              Google
            </Button>
          </div>
          <div className="relative">
            {lastMethod === "github" && (
              <Badge
                className="-right-2 -top-4 absolute z-10"
                variant="default"
              >
                Last Used
              </Badge>
            )}
            <Button
              className="w-full"
              onClick={() => handleSocialAuth({ provider: "github" })}
              type="button"
              variant="outline"
            >
              <Github className="mr-2 size-4" />
              GitHub
            </Button>
          </div>
        </div>

        <div className="relative flex items-center">
          <span className="inline-block h-px w-full border-t bg-border" />
          <span className="shrink-0 px-2 text-muted-foreground text-xs uppercase">
            Or
          </span>
          <span className="inline-block h-px w-full border-t bg-border" />
        </div>

        <form>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label className="sr-only" htmlFor="email">
                Email
              </Label>
              <Input id="email" placeholder="Email" type="email" />
            </div>
            <div className="grid gap-1">
              <Label className="sr-only" htmlFor="password">
                Password
              </Label>
              <div className="relative">
                <Input
                  className="pr-9"
                  id="password"
                  placeholder="Password"
                  type={showPassword ? "text" : "password"}
                />
                <button
                  className="-translate-y-1/2 absolute top-1/2 right-4 text-muted-foreground hover:text-foreground"
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
          <div className="relative">
            {lastMethod === "email" && (
              <Badge
                className="-right-2 -top-4 absolute z-10"
                variant="default"
              >
                Last Used
              </Badge>
            )}
            <Button className="mt-4 w-full" type="submit">
              Continue
            </Button>
          </div>
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
          Don&apos;t have an account?{" "}
          <Link
            className="underline underline-offset-4 hover:text-primary"
            href="/signup"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
