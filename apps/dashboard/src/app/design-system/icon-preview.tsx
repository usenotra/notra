"use client";

import {
  Copy01Icon,
  LinkSquare02Icon,
  Refresh03Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@notra/ui/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { DesignSystemSectionHeader } from "@/components/design-system/design-system-section-header";

export function DesignSystemIconPreview() {
  const [iconLoading, setIconLoading] = useState(false);

  return (
    <section className="scroll-mt-10 space-y-6" id="icons">
      <DesignSystemSectionHeader
        description="Check Hugeicons at small sizes and in loading, disabled, and interactive states. No database required."
        id="icons"
        title="Icons"
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sizes &amp; shapes</CardTitle>
            <CardDescription>
              Check alignment, stroke weight, and legibility in both themes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-6">
                <span className="flex items-center gap-2 text-xs">
                  <HugeiconsIcon icon={Refresh03Icon} size={12} /> 12px
                </span>
                <span className="flex items-center gap-2 text-sm">
                  <HugeiconsIcon icon={Refresh03Icon} size={16} /> 16px
                </span>
                <span className="flex items-center gap-2 text-base">
                  <HugeiconsIcon icon={Refresh03Icon} size={20} /> 20px
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-5 text-sm">
                <span className="flex items-center gap-2">
                  <HugeiconsIcon icon={Tick02Icon} size={16} /> Success
                </span>
                <span className="flex items-center gap-2">
                  <HugeiconsIcon icon={Copy01Icon} size={16} /> Copy
                </span>
                <span className="flex items-center gap-2">
                  <HugeiconsIcon icon={LinkSquare02Icon} size={16} /> External
                  link
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Action states</CardTitle>
            <CardDescription>
              Toggle loading to check the spinner and disabled controls.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  aria-pressed={iconLoading}
                  onClick={() => setIconLoading(!iconLoading)}
                  size="sm"
                  variant="secondary"
                >
                  Toggle loading
                </Button>
                <Button
                  disabled={iconLoading}
                  onClick={() => toast("Rescan preview — no scan started")}
                  size="sm"
                  variant="outline"
                >
                  {iconLoading ? (
                    <Loader2Icon className="size-4 motion-safe:animate-spin" />
                  ) : (
                    <HugeiconsIcon className="size-4" icon={Refresh03Icon} />
                  )}
                  {iconLoading ? "Scanning…" : "Rescan"}
                </Button>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label="Rescan prompt"
                        disabled={iconLoading}
                        onClick={() =>
                          toast("Rescan preview — no scan started")
                        }
                        size="icon-sm"
                        variant="ghost"
                      />
                    }
                  >
                    <HugeiconsIcon icon={Refresh03Icon} size={15} />
                  </TooltipTrigger>
                  <TooltipContent>
                    Re-run this prompt across engines to measure lift
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast("Refresh preview — no tools refreshed")}
                >
                  <HugeiconsIcon icon={Refresh03Icon} size={16} />
                  Refresh tools
                </Button>
                <Button disabled size="sm" variant="outline">
                  <HugeiconsIcon icon={Refresh03Icon} size={16} />
                  Unavailable
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
