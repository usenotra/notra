"use client";

import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import Link from "@/components/framework/link";
import { resetPasswordAction } from "@/lib/auth/password-actions";
import { useRouter } from "@/lib/navigation";

function ResetPasswordForm() {
  const t = useTranslations("auth.resetPassword");
  const tAuthShared = useTranslations("auth.shared");
  const tCommon2 = useTranslations("common");
  const router = useRouter();
  const [token] = useQueryState("token", parseAsString);
  const [error] = useQueryState(
    "error",
    parseAsStringLiteral(["INVALID_TOKEN"])
  );

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (error === "INVALID_TOKEN") {
    return (
      <div className="mx-auto flex min-w-[300px] flex-col gap-8 rounded-md p-6 lg:w-[384px] lg:px-8 lg:py-10">
        <div className="text-center">
          <h1 className="text-xl font-semibold lg:text-2xl">
            {t("invalidTitle")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("invalidDescription")}
          </p>
        </div>
        <Link href="/forgot-password">
          <Button className="w-full">{t("requestNew")}</Button>
        </Link>
        <div className="text-muted-foreground px-8 text-center text-xs">
          <Link
            className="hover:text-primary underline underline-offset-4"
            href="/login"
          >
            {tAuthShared("backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto flex min-w-[300px] flex-col gap-8 rounded-md p-6 lg:w-[384px] lg:px-8 lg:py-10">
        <div className="text-center">
          <h1 className="text-xl font-semibold lg:text-2xl">
            {t("missingTitle")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("missingDescription")}
          </p>
        </div>
        <Link href="/forgot-password">
          <Button className="w-full">{t("requestNew")}</Button>
        </Link>
        <div className="text-muted-foreground px-8 text-center text-xs">
          <Link
            className="hover:text-primary underline underline-offset-4"
            href="/login"
          >
            {tAuthShared("backToLogin")}
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
      toast.error(t("passwordMin"));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t("passwordMismatch"));
      return;
    }

    setIsLoading(true);

    let hasResetError = false;
    let resetErrorMessage: string | null | undefined;
    try {
      const result = await resetPasswordAction({
        newPassword: password,
        token,
      });

      if (result.status === "error") {
        hasResetError = true;
        resetErrorMessage = result.message;
      }
    } catch {
      toast.error(tAuthShared("networkErrorPleaseCheckYour"));
      setIsLoading(false);
      return;
    }

    if (hasResetError) {
      if (resetErrorMessage?.includes("expired")) {
        toast.error(t("linkExpired"));
      } else if (resetErrorMessage?.includes("invalid")) {
        toast.error(t("linkInvalid"));
      } else {
        toast.error(resetErrorMessage ?? tCommon2("errors.generic"));
      }
      setIsLoading(false);
      return;
    }

    toast.success(t("success"));
    router.push("/login");
    setIsLoading(false);
  }

  return (
    <div className="mx-auto flex min-w-[300px] flex-col gap-8 rounded-md p-6 lg:w-[384px] lg:px-8 lg:py-10">
      <div className="text-center">
        <h1 className="text-xl font-semibold lg:text-2xl">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="password">
              {tAuthShared("newPassword")}
            </Label>
            <div className="relative">
              <Input
                autoComplete="new-password"
                className="pr-9"
                disabled={isLoading}
                id="password"
                minLength={8}
                name="password"
                placeholder={tAuthShared("newPassword")}
                required
                type={showPassword ? "text" : "password"}
              />
              <button
                aria-label={
                  showPassword
                    ? tCommon2("labels.hidePassword")
                    : tCommon2("labels.showPassword")
                }
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-4 -translate-y-1/2 disabled:opacity-50"
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
              {t("confirmPassword")}
            </Label>
            <div className="relative">
              <Input
                autoComplete="new-password"
                className="pr-9"
                disabled={isLoading}
                id="confirmPassword"
                minLength={8}
                name="confirmPassword"
                placeholder={t("confirmPasswordPlaceholder")}
                required
                type={showConfirmPassword ? "text" : "password"}
              />
              <button
                aria-label={
                  showConfirmPassword
                    ? t("hideConfirmPassword")
                    : t("showConfirmPassword")
                }
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-4 -translate-y-1/2 disabled:opacity-50"
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
        <p className="text-muted-foreground mt-2 text-xs">{t("passwordMin")}</p>
        <Button className="mt-4 w-full" disabled={isLoading} type="submit">
          {isLoading ? tCommon2("labels.resetting") : t("submit")}
        </Button>
      </form>

      <div className="text-muted-foreground px-8 text-center text-xs">
        <Link
          className="hover:text-primary underline underline-offset-4"
          href="/login"
        >
          {tAuthShared("backToLogin")}
        </Link>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  const tCommon = useTranslations("common");
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-w-[300px] flex-col gap-8 rounded-md p-6 lg:w-[384px] lg:px-8 lg:py-10">
          <div className="text-center">
            <h1 className="text-xl font-semibold lg:text-2xl">
              {tCommon("states.loading")}
            </h1>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
