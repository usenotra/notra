import { Button } from "@/components/button";
import type { GeoPromptDetailStatusProps } from "@/types/geo-prompt-detail";

export function PromptDetailStatus({
  status,
  onRetry,
}: GeoPromptDetailStatusProps) {
  if (status === "loading") {
    return (
      <p className="text-muted-foreground p-6 text-sm" role="status">
        Loading answer…
      </p>
    );
  }
  return (
    <div className="space-y-3 p-6">
      <p className="text-muted-foreground text-sm" role="status">
        {status === "error"
          ? "Could not load this answer. Try again."
          : "This answer is no longer available. Refresh the results to select another answer."}
      </p>
      {status === "error" ? (
        <Button onClick={onRetry} type="button" variant="outline">
          Try again
        </Button>
      ) : null}
    </div>
  );
}
