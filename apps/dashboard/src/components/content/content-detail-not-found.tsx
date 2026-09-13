import { Button } from "@notra/ui/components/ui/button";
import Link from "next/link";

interface ContentDetailNotFoundProps {
  organizationSlug: string;
}

export function ContentDetailNotFound({
  organizationSlug,
}: ContentDetailNotFoundProps) {
  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 lg:px-6">
        <div className="rounded-xl border border-dashed p-12 text-center">
          <h3 className="text-lg font-medium">Content not found</h3>
          <p className="text-muted-foreground text-sm">
            This content may have been deleted or you don't have access to it.
          </p>
          <Link
            className="focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
            href={`/${organizationSlug}/content`}
          >
            <Button className="mt-4" tabIndex={-1} variant="outline">
              Back to Content
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
