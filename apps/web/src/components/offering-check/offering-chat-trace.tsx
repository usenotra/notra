import { AiBrain01Icon, GlobalSearchIcon } from "@hugeicons/core-free-icons";
import { MessageResponse } from "@notra/ui/components/ai-elements/message";

import type { OfferingChatTraceProps } from "@/types/offering-check";

import { OfferingSearchActivity } from "./offering-search-activity";
import { OfferingTraceStep } from "./offering-trace-step";

export function OfferingChatTrace({
  thread,
  reasoning,
  answered,
}: OfferingChatTraceProps) {
  const { domains, queries } = thread;
  const searched = queries.length > 0 || domains.length > 0;

  if (reasoning.length === 0 && !searched) {
    return null;
  }

  return (
    <div className="border-border mb-2 flex flex-col gap-3 border-l pl-3.5">
      {reasoning.length > 0 ? (
        <OfferingTraceStep icon={AiBrain01Icon} label="Thought">
          <MessageResponse className="text-muted-foreground text-[14px] leading-6 [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_strong]:font-medium">
            {reasoning}
          </MessageResponse>
        </OfferingTraceStep>
      ) : null}
      {searched ? (
        <OfferingTraceStep
          icon={GlobalSearchIcon}
          label="Searched the web"
          meta={`${domains.length} ${domains.length === 1 ? "site" : "sites"}`}
        >
          <OfferingSearchActivity
            domains={domains}
            links={Object.fromEntries(
              (thread.result?.sources ?? []).map((source) => [
                source.domain,
                source.topUrl,
              ])
            )}
            live={!answered}
            queries={queries}
          />
        </OfferingTraceStep>
      ) : null}
    </div>
  );
}
