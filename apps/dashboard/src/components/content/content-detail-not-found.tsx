import Link from "next/link";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateCardsPreview } from "@/components/empty-state-preview";
import { EMPTY_STATE_CARD_COUNT } from "@/constants/empty-state";

interface ContentDetailNotFoundProps {
  organizationSlug: string;
}

export function ContentDetailNotFound({
  organizationSlug,
}: ContentDetailNotFoundProps) {
  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 lg:px-6">
        <EmptyState
          action={
            <Button
              nativeButton={false}
              render={<Link href={`/${organizationSlug}/content`} />}
              variant="outline"
            >
              Back to Content
            </Button>
          }
          description="This content may have been deleted, or you don't have access to it."
          preview={
            <EmptyStateCardsPreview
              columns={3}
              count={EMPTY_STATE_CARD_COUNT.content}
              variant="content"
            />
          }
          title="Content not found"
        />
      </div>
    </div>
  );
}
