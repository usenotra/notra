"use client";

import { LinkSquare02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Raycast } from "@notra/ui/components/ui/svgs/raycast";
import { useState } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import Link from "@/components/framework/link";

interface RaycastSetupGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationSlug: string;
}

const STEPS = [
  {
    key: "install",
    link: { href: "https://www.raycast.com/dominikdev/notra" },
  },
  { key: "apiKey", internalLink: true },
  { key: "configure" },
  { key: "use" },
] as const;

export function RaycastSetupGuideDialog({
  open,
  onOpenChange,
  organizationSlug,
}: RaycastSetupGuideDialogProps) {
  const tCommon = useTranslations("common");
  const t = useTranslations("integrations.raycast");
  const tGuide = useTranslations("integrations.setupGuide");
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  function toggleStep(index: number) {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent className="sm:max-w-[540px]">
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-3">
            <Raycast className="h-7 w-7" />
            <div>
              <ResponsiveDialogTitle className="text-xl">
                {t("title")}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {t("description")}
              </ResponsiveDialogDescription>
            </div>
          </div>
        </ResponsiveDialogHeader>

        <div className="space-y-1 py-4">
          {STEPS.map((step, index) => {
            const isCompleted = completedSteps.has(index);

            return (
              <div
                className="group hover:bg-muted/60 w-full rounded-lg p-3 text-left transition-colors"
                key={step.key}
              >
                <button
                  aria-pressed={isCompleted}
                  className="flex w-full gap-3 text-left"
                  onClick={() => toggleStep(index)}
                  type="button"
                >
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors ${
                      isCompleted
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <HugeiconsIcon
                        icon={Tick02Icon}
                        className="h-3.5 w-3.5"
                      />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${isCompleted ? "text-muted-foreground" : "text-foreground"}`}
                    >
                      {t(`steps.${step.key}.title`)}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                      {t(`steps.${step.key}.description`)}
                    </p>
                  </div>
                </button>
                {"link" in step && step.link ? (
                  <a
                    className="text-primary ms-9 mt-1.5 inline-flex items-center gap-1 text-xs hover:underline"
                    href={step.link.href}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {t("linkLabel")}
                    <HugeiconsIcon
                      icon={LinkSquare02Icon}
                      className="h-3 w-3"
                    />
                  </a>
                ) : null}
                {"internalLink" in step && step.internalLink ? (
                  <Link
                    className="text-primary ms-9 mt-1.5 inline-flex items-center gap-1 text-xs hover:underline"
                    href={`/${organizationSlug}/api-keys`}
                  >
                    {tGuide("goToApiKeys")}
                    <HugeiconsIcon
                      icon={LinkSquare02Icon}
                      className="h-3 w-3"
                    />
                  </Link>
                ) : null}
              </div>
            );
          })}
        </div>

        <ResponsiveDialogFooter>
          <ResponsiveDialogClose render={<Button variant="outline" />}>
            {tCommon("actions.close")}
          </ResponsiveDialogClose>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
