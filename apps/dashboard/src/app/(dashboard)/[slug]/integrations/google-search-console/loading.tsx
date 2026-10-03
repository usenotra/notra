import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import { PageContainer } from "@/components/layout/container";
import { PageHeading } from "@/components/layout/page-heading";

import { GoogleSearchConsolePageSkeleton } from "./skeleton";

export default function Loading() {
  const t = useTranslations("integrations.gscPage");
  const tCommon = useTranslations("common");

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <PageHeading description={t("description")} title={t("title")}>
          <Button className="gap-1.5" disabled>
            <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
            {tCommon("labels.connectSearchConsole")}
            <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>
          </Button>
        </PageHeading>
        <GoogleSearchConsolePageSkeleton />
      </div>
    </PageContainer>
  );
}
