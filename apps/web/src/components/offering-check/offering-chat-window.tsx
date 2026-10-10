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
import {
  OFFERING_ANSWER_MARKDOWN_CLASS,
  OFFERING_ENTER_CLASS,
} from "@/constants/offering-check-styles";
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

import { OfferingChatTrace } from "./offering-chat-trace";
import { OfferingSources } from "./offering-sources";

function OfferingChatReasoning({
  thread,
  webSearch,
}: OfferingChatReasoningProps) {
  const reasoning = thread.reasoning.trim();
  const answered = thread.seconds !== null;
  const liveSeconds = useElapsedSeconds(!answered);
  const started =
    answered ||
    thread.queries.length > 0 ||
    thread.domains.length > 0 ||
    reasoning.length > 0 ||
    thread.answer.length > 0;

  if (!started) {
    return (
      <Shimmer className="text-[15px] leading-7 font-medium">
        {webSearch ? "Searching the web" : "Thinking"}
      </Shimmer>
    );
  }

  const searchSkipped = webSearch && thread.result?.searchUsed === false;

  return (
    <div className="flex flex-col items-start gap-2.5">
      <ChatgptReasoning
        complete={answered}
        seconds={thread.seconds ?? liveSeconds}
      >
        <OfferingChatTrace
          answered={answered}
          reasoning={reasoning}
          thread={thread}
        />
      </ChatgptReasoning>
      {searchSkipped ? (
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
            className={cn("[&>div]:max-w-[88%]", OFFERING_ENTER_CLASS)}
            from="user"
          >
            {thread.question.text}
          </ChatgptMessage>

          <ChatgptMessage
            className={cn(
              OFFERING_ENTER_CLASS,
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
                  OFFERING_ANSWER_MARKDOWN_CLASS,
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
