"use client";

import {
  Cancel01Icon,
  MinusSignIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@notra/ui/components/shared/responsive-dialog";
import { Dithering } from "@paper-design/shaders-react";
import { Loader2Icon } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import { useState } from "react";

import { Button } from "@/components/button";
import {
  EVE_BANNER_COLORS_DARK,
  EVE_BANNER_COLORS_LIGHT,
  EVE_BANNER_DITHER_SCALE,
  EVE_BANNER_DITHER_SHAPE,
  EVE_BANNER_DITHER_SIZE,
  EVE_BANNER_DITHER_SPEED,
  EVE_BANNER_DITHER_TYPE,
  EVE_SETUP_CONS,
  EVE_SETUP_PROS,
} from "@/constants/onboarding-agent";
import type { OnboardingAgentBannerProps } from "@/types/components/onboarding-agent-banner";

export function OnboardingAgentBanner({
  onDismiss,
  onStart,
  starting,
  state,
}: OnboardingAgentBannerProps) {
  const { resolvedTheme } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const colors =
    resolvedTheme === "dark" ? EVE_BANNER_COLORS_DARK : EVE_BANNER_COLORS_LIGHT;

  const handleConfirm = () => {
    setConfirmOpen(false);
    onStart();
  };

  return (
    <div className="relative isolate flex h-full w-full items-center justify-center overflow-hidden bg-white dark:bg-[#131316]">
      <Dithering
        className="absolute -inset-px -z-10 size-[calc(100%+2px)] min-h-full min-w-full"
        colorBack={colors.colorBack}
        colorFront={colors.colorFront}
        scale={EVE_BANNER_DITHER_SCALE}
        shape={EVE_BANNER_DITHER_SHAPE}
        size={EVE_BANNER_DITHER_SIZE}
        speed={shouldReduceMotion ? 0 : EVE_BANNER_DITHER_SPEED}
        type={EVE_BANNER_DITHER_TYPE}
      />
      {state === "running" ? (
        <output className="text-foreground flex items-center gap-2">
          <Loader2Icon
            aria-hidden
            className="size-4 animate-spin motion-reduce:animate-none"
          />
          <span className="text-sm font-medium">
            We are setting up your workspace
          </span>
        </output>
      ) : (
        <div className="text-foreground flex items-center gap-3">
          <span className="text-sm font-medium">
            We can set up your workspace for you
          </span>
          <ResponsiveDialog onOpenChange={setConfirmOpen} open={confirmOpen}>
            <ResponsiveDialogTrigger
              disabled={starting}
              render={<Button size="sm" />}
            >
              {starting ? (
                <Loader2Icon
                  aria-hidden
                  className="size-4 animate-spin motion-reduce:animate-none"
                />
              ) : null}
              Start Setup
            </ResponsiveDialogTrigger>
            <ResponsiveDialogContent>
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle className="text-lg font-semibold">
                  Let us set up your workspace
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  We visit your website, work out what your company does, and
                  set Notra up to match. It takes a few minutes.
                </ResponsiveDialogDescription>
              </ResponsiveDialogHeader>
              <ul className="space-y-2.5">
                {EVE_SETUP_PROS.map((item) => (
                  <li className="flex items-center gap-2.5" key={item}>
                    <span className="bg-success/10 text-success flex size-5 shrink-0 items-center justify-center rounded-full">
                      <HugeiconsIcon
                        className="size-3"
                        icon={PlusSignIcon}
                        strokeWidth={2.5}
                      />
                    </span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
                {EVE_SETUP_CONS.map((item) => (
                  <li className="flex items-center gap-2.5" key={item}>
                    <span className="bg-destructive/10 text-destructive flex size-5 shrink-0 items-center justify-center rounded-full">
                      <HugeiconsIcon
                        className="size-3"
                        icon={MinusSignIcon}
                        strokeWidth={2.5}
                      />
                    </span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <ResponsiveDialogFooter className="sm:justify-center">
                <ResponsiveDialogClose render={<Button variant="outline" />}>
                  Cancel
                </ResponsiveDialogClose>
                <Button onClick={handleConfirm}>Start Setup</Button>
              </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
          </ResponsiveDialog>
          <Button
            aria-label="Dismiss workspace setup banner"
            className="absolute top-1/2 right-3 -translate-y-1/2"
            onClick={onDismiss}
            size="icon-sm"
            variant="ghost"
          >
            <HugeiconsIcon className="size-4" icon={Cancel01Icon} />
          </Button>
        </div>
      )}
    </div>
  );
}
