import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PageHeading } from "@notra/ui/components/shared/page-heading";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { PageContainer } from "@/components/layout/container";

import {
  GitHubIntegrationSkeleton,
  GitHubRepositoriesSkeleton,
} from "./skeleton";

export default function Loading() {
  const tIntegrationsShared = useTranslations("integrations.shared");

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading title="GitHub">
          <Button className="gap-1.5" disabled>
            <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
            {tIntegrationsShared("connectGithub")}
            <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
          </Button>
        </PageHeading>
        <GitHubIntegrationSkeleton />
        <GitHubRepositoriesSkeleton />
      </div>
    </PageContainer>
  );
}
