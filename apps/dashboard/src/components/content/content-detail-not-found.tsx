import { Button } from "@notra/ui/components/ui/button";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";

interface ContentDetailNotFoundProps {
  organizationSlug: string;
}

export function ContentDetailNotFound({
  organizationSlug,
}: ContentDetailNotFoundProps) {
  const t = useTranslations("content.detail");
  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 lg:px-6">
        <EmptyState
          action={
            <Link href={`/${organizationSlug}/content`}>
              <Button tabIndex={-1} variant="outline">
                {t("backToContent")}
              </Button>
            </Link>
          }
          description={t("notFoundDescription")}
          title={t("notFoundTitle")}
        />
      </div>
    </div>
  );
}
