"use client";

import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import Link from "@/components/framework/link";
import { forgotPasswordAction } from "@/lib/auth/password-actions";

export default function ForgotPassword() {
  const t = useTranslations("auth.forgotPassword");
  const tAuthShared = useTranslations("auth.shared");
  const tCommon = useTranslations("common");
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
      await forgotPasswordAction({ email });
      setIsSubmitted(true);
    } catch {
      toast.error(tAuthShared("networkErrorPleaseCheckYour"));
    }
    setIsLoading(false);
  }

  if (isSubmitted) {
    return (
      <div className="mx-auto flex min-w-[300px] flex-col gap-8 rounded-md p-6 lg:w-[384px] lg:px-8 lg:py-10">
        <div className="text-center">
          <h1 className="text-xl font-semibold lg:text-2xl">
            {t("checkEmailTitle")}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("checkEmailDescription")}
          </p>
        </div>

        <div className="flex flex-col gap-4 text-center">
          <p className="text-muted-foreground text-sm">{t("notReceived")}</p>
          <Button
            onClick={() => setIsSubmitted(false)}
            type="button"
            variant="outline"
          >
            {tCommon("actions.tryAgain")}
          </Button>
        </div>

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

  return (
    <div className="mx-auto flex min-w-[300px] flex-col gap-8 rounded-md p-6 lg:w-[384px] lg:px-8 lg:py-10">
      <div className="text-center">
        <h1 className="text-xl font-semibold lg:text-2xl">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">
              {tCommon("labels.email")}
            </Label>
            <Input
              autoComplete="email"
              disabled={isLoading}
              id="email"
              name="email"
              placeholder={tCommon("labels.email")}
              required
              type="email"
            />
          </div>
        </div>
        <Button className="mt-4 w-full" disabled={isLoading} type="submit">
          {isLoading ? tCommon("labels.sending") : t("submit")}
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
