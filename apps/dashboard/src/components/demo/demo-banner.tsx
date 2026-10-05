"use client";

import { Refresh03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@notra/ui/components/shared/responsive-alert-dialog";
import { Button } from "@notra/ui/components/ui/button";
import { Notra } from "@notra/ui/components/ui/svgs/notra";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { DemoCustomizeDialog } from "@/components/demo/demo-customize-dialog";
import { DEMO_SIGNUP_URL } from "@/constants/demo";
import { useDemoSandbox } from "@/lib/hooks/use-demo-sandbox";
import { demoHomePath } from "@/utils/demo-return-to";
import { rebuildDemoSandbox } from "@/utils/demo-sandbox-request";

/**
 * Top bar of the public demo: invites the visitor to make the demo their own,
 * resets the workspace and links to sign-up. Fades in once on load; its
 * height is reserved up front so the page below never shifts.
 */
export function DemoBanner() {
  const t = useTranslations("demo.banner");
  const { data: sandbox } = useDemoSandbox(true);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const firstName = sandbox?.personalization?.firstName;

  const handleReset = async () => {
    setResetting(true);
    try {
      const slug = await rebuildDemoSandbox("reset");
      window.location.assign(demoHomePath(slug));
    } catch {
      setResetting(false);
      toast.error(t("resetFailed"));
    }
  };

  return (
    <div className="bg-background text-foreground animate-in fade-in slide-in-from-top-4 flex h-(--demo-banner-height) shrink-0 items-center gap-3 border-b px-4 text-sm duration-700 ease-out motion-reduce:animate-none">
      <span
        aria-hidden="true"
        className="dark:bg-foreground flex size-7 shrink-0 items-center justify-center rounded-lg"
      >
        <Notra className="size-5" />
      </span>
      {/* Phones keep the actions; the greeting needs the room on wider screens. */}
      <p className="hidden min-w-0 truncate sm:block">
        {firstName ? t("titleNamed", { name: firstName }) : t("title")}
      </p>
      <button
        className="decoration-foreground/30 hover:decoration-foreground focus-visible:ring-ring/50 inline-flex h-7 shrink-0 cursor-pointer items-center rounded-md px-1 underline underline-offset-4 transition-colors outline-none focus-visible:ring-3"
        onClick={() => setCustomizeOpen(true)}
        type="button"
      >
        {t("customize")}
      </button>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button
          aria-label={t("reset")}
          onClick={() => setResetOpen(true)}
          size="sm"
          variant="outline"
        >
          <HugeiconsIcon icon={Refresh03Icon} />
          <span className="hidden lg:inline">{t("reset")}</span>
        </Button>
        <Button
          nativeButton={false}
          render={<a href={DEMO_SIGNUP_URL} rel="noopener" target="_top" />}
          size="sm"
        >
          {t("signup")}
        </Button>
      </div>

      {sandbox ? (
        <DemoCustomizeDialog
          current={sandbox.personalization}
          key={sandbox.personalization?.companyName ?? "default"}
          onOpenChange={setCustomizeOpen}
          open={customizeOpen}
        />
      ) : null}

      <ResponsiveAlertDialog onOpenChange={setResetOpen} open={resetOpen}>
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>
              {t("resetTitle")}
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription>
              {t("resetDescription")}
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel disabled={resetting}>
              {t("cancel")}
            </ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              disabled={resetting}
              onClick={(event) => {
                event.preventDefault();
                void handleReset();
              }}
              type="button"
            >
              {resetting ? t("resetting") : t("resetConfirm")}
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </div>
  );
}
