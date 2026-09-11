import type { SecurityLoadErrorProps } from "../../../lib/security-types";
import { Button } from "../../ui/button";

export function SecurityLoadError({ message, onRetry }: SecurityLoadErrorProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
      <p className="text-destructive text-sm">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} size="sm" type="button" variant="outline">
          Try again
        </Button>
      )}
    </div>
  );
}
