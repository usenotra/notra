"use client";

import { Button } from "@notra/ui/components/ui/button";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { authClient } from "@/lib/auth/client";

export function BannedNotice() {
  const t = useTranslations("auth.banned");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const signOut = authClient.useSignOut();

  function handleSignOut() {
    setIsSigningOut(true);
    signOut().catch(() => setIsSigningOut(false));
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-md border p-8 text-center">
      <h1 className="text-lg font-semibold">{t("title")}</h1>
      <p className="text-muted-foreground text-sm">
        {t("description", { email: "support@usenotra.com" })}
      </p>
      <Button disabled={isSigningOut} onClick={handleSignOut} variant="outline">
        {t("signOut")}
      </Button>
    </div>
  );
}
