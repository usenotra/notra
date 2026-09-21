"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useId } from "react";

import { Button } from "@/components/button";
import { PageContainer } from "@/components/layout/container";

export function BrandIdentityPageSkeleton() {
  const id = useId();
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Brand Identity
            </h1>
            <p className="text-muted-foreground text-sm">
              Configure your brand identity and tone
            </p>
          </div>
          <Button>
            <HugeiconsIcon className="size-4" icon={Add01Icon} />
            Create Identity
            <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
          </Button>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              className="border-border/80 bg-muted/80 rounded-lg border p-2"
              key={`${id}-card-${i}`}
            >
              <div className="px-2 py-1.5">
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="border-border/80 bg-background space-y-3 rounded-lg border px-4 py-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton
                    className={`h-4 ${j === 4 ? "w-2/3" : "w-full"}`}
                    key={`${id}-line-${i}-${j}`}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="border-border/80 bg-muted/80 rounded-lg border p-2 lg:col-span-2">
            <div className="px-2 py-1.5">
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="border-border/80 bg-background space-y-3 rounded-lg border px-4 py-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
