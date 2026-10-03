"use client";

import { LinkSquare02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Framer } from "@notra/ui/components/ui/svgs/framer";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

import { PageContainer } from "@/components/layout/container";

const STEPS = [
  {
    key: "install",
    link: { href: "https://www.framer.com/marketplace/plugins/notra/" },
  },
  { key: "apiKey", internalLink: true },
  { key: "configure" },
  { key: "use" },
] as const;

interface PageClientProps {
  organizationSlug: string;
}

export default function PageClient({ organizationSlug }: PageClientProps) {
  const t = useTranslations("integrations.framer");
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
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="flex flex-col items-start gap-3 @min-[40rem]/main:flex-row @min-[40rem]/main:justify-between">
          <div className="flex items-center gap-3">
            <Framer className="h-8 w-8" />
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">
                {t("title")}
              </h1>
              <p className="text-muted-foreground">{t("description")}</p>
            </div>
          </div>
        </div>

        <div className="max-w-xl space-y-1">
          {STEPS.map((step, index) => {
            const isCompleted = completedSteps.has(index);

            return (
              <button
                className="group hover:bg-muted/60 flex w-full gap-3 rounded-lg p-3 text-left transition-colors"
                key={step.key}
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
                    <HugeiconsIcon icon={Tick02Icon} className="h-3.5 w-3.5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}
                  >
                    {t(`steps.${step.key}.title`)}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                    {t(`steps.${step.key}.description`)}
                  </p>
                  {"link" in step && step.link ? (
                    <a
                      className="text-primary mt-1.5 inline-flex items-center gap-1 text-xs hover:underline"
                      href={step.link.href}
                      onClick={(e) => e.stopPropagation()}
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
                      className="text-primary mt-1.5 inline-flex items-center gap-1 text-xs hover:underline"
                      href={`/${organizationSlug}/api-keys`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {tGuide("goToApiKeys")}
                      <HugeiconsIcon
                        icon={LinkSquare02Icon}
                        className="h-3 w-3"
                      />
                    </Link>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}
