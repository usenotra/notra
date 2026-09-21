"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import Link from "next/link";
import { useParams, useSelectedLayoutSegment } from "next/navigation";

import { PageContainer } from "@/components/layout/container";

export function IntegrationsBackLink() {
  const segment = useSelectedLayoutSegment();
  const { slug } = useParams<{ slug: string }>();

  if (!segment) {
    return null;
  }

  return (
    <PageContainer className="pt-4 md:pt-6">
      <div className="px-4 lg:px-6">
        <Button
          render={<Link href={`/${slug}/integrations`} />}
          size="sm"
          variant="ghost"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
          Back to integrations
        </Button>
      </div>
    </PageContainer>
  );
}
