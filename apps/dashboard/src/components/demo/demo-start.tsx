"use client";

import { Button } from "@notra/ui/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";

import type { DemoSandboxCreateResponse } from "@/types/demo";
import { resolveDemoLanding } from "@/utils/demo-return-to";

interface DemoStartProps {
  returnTo: string | null;
}

async function createSandbox(): Promise<DemoSandboxCreateResponse> {
  const response = await fetch("/api/demo/sandbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
  if (!response.ok) {
    throw new Error(`Sandbox creation failed with ${response.status}`);
  }
  return response.json();
}

export function DemoStart({ returnTo }: DemoStartProps) {
  const t = useTranslations("demo.start");
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  const start = useCallback(() => {
    setFailed(false);
    createSandbox()
      .then(({ slug }) => {
        window.location.replace(resolveDemoLanding(returnTo, slug));
      })
      .catch(() => setFailed(true));
  }, [returnTo]);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    start();
  }, [start]);

  return (
    <div
      aria-live="polite"
      className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 text-center"
    >
      {failed ? (
        <>
          <h1 className="text-lg font-semibold">{t("errorTitle")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("errorDescription")}
          </p>
          <Button onClick={start} variant="outline">
            {t("retry")}
          </Button>
        </>
      ) : (
        <>
          <span className="text-muted-foreground size-5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
        </>
      )}
    </div>
  );
}
