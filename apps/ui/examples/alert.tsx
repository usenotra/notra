import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@notra/ui/components/ui/alert";
import { Github } from "@notra/ui/components/ui/svgs/github";

export default function AlertExample() {
  return (
    <div className="flex max-w-lg flex-col gap-3 p-4">
      <Alert>
        <Github className="size-4" />
        <AlertTitle>GitHub connected</AlertTitle>
        <AlertDescription>
          New merged PRs will appear as draft candidates.
        </AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
        <AlertTitle>Generation failed</AlertTitle>
        <AlertDescription>
          The model hit a rate limit. Retry in a few minutes.
        </AlertDescription>
      </Alert>
    </div>
  );
}
