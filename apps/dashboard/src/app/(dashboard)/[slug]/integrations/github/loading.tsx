import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";

import { Button } from "@/components/button";
import { PageContainer } from "@/components/layout/container";

import {
  GitHubIntegrationSkeleton,
  GitHubRepositoriesSkeleton,
} from "./skeleton";

export default function Loading() {
  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">GitHub</h1>
            <p className="text-muted-foreground">
              Manage repository access and where Notra publishes draft pull
              requests.
            </p>
          </div>
          <Button className="gap-1.5" disabled>
            <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
            Connect GitHub
            <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
          </Button>
        </div>
        <GitHubIntegrationSkeleton />
        <GitHubRepositoriesSkeleton />
      </div>
    </PageContainer>
  );
}
