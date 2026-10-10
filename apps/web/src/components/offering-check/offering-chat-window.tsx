import { AiBrain01Icon, GlobalSearchIcon } from "@hugeicons/core-free-icons";
import { MessageResponse } from "@notra/ui/components/ai-elements/message";
import { Shimmer } from "@notra/ui/components/ai-elements/shimmer";
import { ChatgptMessage } from "@notra/ui/components/ai-skins/chatgpt/chatgpt-message";
import { ChatgptReasoning } from "@notra/ui/components/ai-skins/chatgpt/chatgpt-reasoning";
import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { geoAnswerMarkdownFontClass } from "@notra/ui/lib/geo-answer-font";
import { cn } from "@notra/ui/lib/utils";

import {
  OFFERING_CHECK_MODEL_LABEL,
  OFFERING_SEARCH_SKIPPED_HINT,
} from "@/constants/offering-check";
import { useElapsedSeconds } from "@/lib/offering-check/use-elapsed-seconds";
import type {
  OfferingChatReasoningProps,
  OfferingChatWindowProps,
} from "@/types/offering-check";
import {
  createFeatureHighlightPlugin,
  stripAnswerCitations,
} from "@/utils/offering-markdown";
import { offeringQuestionTitle } from "@/utils/offering-questions";

import { OfferingSearchActivity } from "./offering-search-activity";
import { OfferingSources } from "./offering-sources";
import { OfferingTraceStep } from "./offering-trace-step";

const ANSWER_MARKDOWN_CLASS =
  "[&_h1]:mt-0 [&_h1]:mb-2 [&_h1]:text-[1.15em] [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-[1.05em] [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-[1em] [&_h3]:font-semibold [&_p]:my-2.5 [&_ul]:my-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1";
const ENTER_CLASS =
  "animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500 motion-reduce:animate-none";

function OfferingChatReasoning({
  thread,
  webSearch,
}: OfferingChatReasoningProps) {
  const reasoning = thread.reasoning.trim();
  const answered = thread.seconds !== null;
  const liveSeconds = useElapsedSeconds(!answered);
  const { domains, queries } = thread;
  const searched = queries.length > 0 || domains.length > 0;
  const started =
    answered || searched || reasoning.length > 0 || thread.answer.length > 0;

  if (!started) {
    return (
      <Shimmer className="text-[15px] leading-7 font-medium">
        Searching the web
      </Shimmer>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2.5">
      <ChatgptReasoning
        complete={answered}
        seconds={thread.seconds ?? liveSeconds}
      >
        {reasoning.length > 0 || searched ? (
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
        ) : null}
      </ChatgptReasoning>
      {webSearch && thread.result?.searchUsed === false ? (
        <p className="text-muted-foreground text-[14px] leading-6">
          {OFFERING_SEARCH_SKIPPED_HINT}
        </p>
      ) : null}
    </div>
  );
}

export function OfferingChatWindow({
  feature,
  hasFeature,
  thread,
  webSearch,
}: OfferingChatWindowProps) {
  const answer = stripAnswerCitations(thread.answer);
  const answered = thread.seconds !== null;

  return (
    <div className="border-border bg-muted flex min-w-0 flex-col rounded-[1.125rem] border p-0.5 shadow-[0_0.0625rem_0.125rem_#1E1E1E0A,0_0.5rem_1.5rem_-0.5rem_#1E1E1E14] dark:shadow-none">
      <div className="flex h-10 items-center gap-2.5 px-4">
        <EngineIcon className="block size-4 shrink-0" engine="openai" />
        <h3 className="text-foreground min-w-0 grow truncate text-sm leading-5 font-medium">
          {offeringQuestionTitle(thread.question.kind, hasFeature)}
          <span className="text-muted-foreground pl-2 font-normal">
            {OFFERING_CHECK_MODEL_LABEL}
          </span>
        </h3>
      </div>
      <div
        aria-busy={!answered}
        className="border-border bg-background flex min-h-[19rem] flex-col overflow-hidden rounded-2xl border"
      >
        <div className="flex flex-col gap-5 px-5 py-5">
          <ChatgptMessage
            className={cn("[&>div]:max-w-[88%]", ENTER_CLASS)}
            from="user"
          >
            {thread.question.text}
          </ChatgptMessage>

          <ChatgptMessage
            className={cn(
              ENTER_CLASS,
              "[animation-delay:300ms] motion-reduce:[animation-delay:0ms]"
            )}
            from="assistant"
            reasoning={
              <OfferingChatReasoning thread={thread} webSearch={webSearch} />
            }
          >
            {answer.length > 0 ? (
              <MessageResponse
                className={cn(
                  ANSWER_MARKDOWN_CLASS,
                  geoAnswerMarkdownFontClass("chatgpt")
                )}
                rehypePlugins={[createFeatureHighlightPlugin(feature)]}
              >
                {answer}
              </MessageResponse>
            ) : null}
            {thread.result ? (
              <OfferingSources sources={thread.result.sources} />
            ) : null}
          </ChatgptMessage>
        </div>
      </div>
    </div>
  );
}
