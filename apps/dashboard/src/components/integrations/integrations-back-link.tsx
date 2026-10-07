"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import { useTranslations } from "use-intl";

import Link from "@/components/framework/link";
import { PageContainer } from "@/components/layout/container";
import { useParams, usePathname } from "@/lib/navigation";

export function IntegrationsBackLink() {
  const t = useTranslations("integrations");
  const pathname = usePathname();
  const { slug } = useParams<{ slug: string }>();

  if (pathname === `/${slug}/integrations`) {
    return null;
  }

  return (
    <PageContainer className="pt-4 md:pt-6">
      <div className="px-4 lg:px-6">
        <Button
          nativeButton={false}
          role="link"
          render={<Link href={`/${slug}/integrations`} />}
          size="sm"
          variant="ghost"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
          {t("backLink")}
        </Button>
      </div>
    </PageContainer>
  );
}
