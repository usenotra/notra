"use client";

import { AiBrain01Icon, GlobalSearchIcon } from "@hugeicons/core-free-icons";
import { MessageResponse } from "@notra/ui/components/ai-elements/message";
import { Shimmer } from "@notra/ui/components/ai-elements/shimmer";
import { ChatgptMessage } from "@notra/ui/components/brainless/chatgpt/chatgpt-message";
import { ChatgptReasoning } from "@notra/ui/components/brainless/chatgpt/chatgpt-reasoning";
import { ChatgptThinking } from "@notra/ui/components/brainless/chatgpt/chatgpt-thinking";
import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { geoAnswerMarkdownFontClass } from "@notra/ui/lib/geo-answer-font";
import { cn } from "@notra/ui/lib/utils";
import { type ComponentProps, useState } from "react";

import {
  OFFERING_CHECK_MODEL_LABEL,
  OFFERING_MODE_TITLES,
  OFFERING_SEARCH_SKIPPED_HINT,
} from "@/constants/offering-check";
import { useElapsedSeconds } from "@/lib/offering-check/use-elapsed-seconds";
import type {
  OfferingChatPhase,
  OfferingChatWindowProps,
} from "@/types/offering-check";
import {
  markFeatureMentions,
  OFFERING_MENTION_HREF,
  stripAnswerCitations,
} from "@/utils/offering-check";

import { OfferingSearchActivity } from "./offering-search-activity";
import { OfferingSources } from "./offering-sources";
import { OfferingTraceStep } from "./offering-trace-step";

const ANSWER_MARKDOWN_CLASS =
  "[&_h1]:mt-0 [&_h1]:mb-2 [&_h1]:text-[1.15em] [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-[1.05em] [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-[1em] [&_h3]:font-semibold [&_p]:my-2.5 [&_ul]:my-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1";
const ENTER_CLASS =
  "animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500 motion-reduce:animate-none";

function MentionLink({ href, children }: ComponentProps<"a">) {
  if (href === OFFERING_MENTION_HREF) {
    return (
      <mark className="rounded bg-[#8B5CF626] box-decoration-clone px-0.5 text-inherit dark:bg-[#8B5CF640]">
        {children}
      </mark>
    );
  }
  return (
    <a
      className="underline underline-offset-2"
      href={href}
      rel="noopener noreferrer nofollow"
      target="_blank"
    >
      {children}
    </a>
  );
}

const ANSWER_COMPONENTS = { a: MentionLink };

export function OfferingChatWindow({
  mode,
  feature,
  question,
  state,
}: OfferingChatWindowProps) {
  const isSearch = mode === "search";
  const [live] = useState(() => state.result === null);
  const enterClass = live ? ENTER_CLASS : null;
  const answer = markFeatureMentions(
    stripAnswerCitations(state.answers[mode]),
    feature
  );
  const reasoning = state.reasoning[mode].trim();
  const finalSeconds = state.seconds[mode];
  const answered = finalSeconds !== null;
  const liveSeconds = useElapsedSeconds(!answered);
  const hasSearchActivity =
    isSearch && (state.queries.length > 0 || state.domains.length > 0);

  const hasTrace = reasoning.length > 0 || hasSearchActivity;
  const siteNoun = state.domains.length === 1 ? "site" : "sites";
  const siteCountLabel = `${state.domains.length} ${siteNoun}`;

  let phase: OfferingChatPhase = "thinking";
  if (state.result) {
    phase = "done";
  } else if (answered) {
    phase = "grading";
  } else if (answer.length > 0) {
    phase = "writing";
  } else if (isSearch && !hasSearchActivity && reasoning.length === 0) {
    phase = "searching";
  }

  const searchSkipped = isSearch && state.result?.searchUsed === false;
  const showWorkedFor =
    answered || reasoning.length > 0 || answer.length > 0 || hasSearchActivity;

  return (
    <div className="flex min-w-0 flex-col rounded-2xl shadow-[0_0_0_0.0625rem_#1E1E1E05,0_0.0625rem_0.125rem_#1E1E1E0A,0_0.5rem_1.5rem_-0.5rem_#1E1E1E14,0_1.5rem_3rem_-1.5rem_#8B5CF61F] dark:shadow-none">
      <div className="border-border bg-muted flex h-16 items-center gap-2.5 rounded-t-2xl border border-b-0 px-5 pb-5">
        <EngineIcon className="block size-4.5 shrink-0" engine="openai" />
        <h3 className="text-foreground min-w-0 grow truncate text-[15px] leading-5 font-semibold">
          {OFFERING_MODE_TITLES[mode]}
          <span className="text-muted-foreground pl-2 font-normal">
            {OFFERING_CHECK_MODEL_LABEL}
          </span>
        </h3>
      </div>

      <div
        aria-busy={!answered}
        className="border-border bg-background relative z-10 -mt-5 flex min-h-[19rem] flex-col gap-5 overflow-hidden rounded-2xl border px-5 py-5"
      >
        <ChatgptMessage
          className={cn("[&>div]:max-w-[88%]", enterClass)}
          from="user"
        >
          {question}
        </ChatgptMessage>

        <ChatgptMessage
          className={cn(
            enterClass,
            live ? "delay-300 motion-reduce:delay-0" : null
          )}
          from="assistant"
          reasoning={
            <div className="flex flex-col items-start gap-2.5">
              {showWorkedFor ? (
                <ChatgptReasoning
                  complete={answered}
                  seconds={finalSeconds ?? liveSeconds}
                >
                  {hasTrace ? (
                    <div className="border-border mb-2 flex flex-col gap-3 border-l pl-3.5">
                      {reasoning.length > 0 ? (
                        <OfferingTraceStep icon={AiBrain01Icon} label="Thought">
                          <MessageResponse className="text-muted-foreground text-[14px] leading-6 [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_strong]:font-medium">
                            {reasoning}
                          </MessageResponse>
                        </OfferingTraceStep>
                      ) : null}
                      {hasSearchActivity ? (
                        <OfferingTraceStep
                          icon={GlobalSearchIcon}
                          label="Searched the web"
                          meta={siteCountLabel}
                        >
                          <OfferingSearchActivity
                            domains={state.domains}
                            queries={state.queries}
                          />
                        </OfferingTraceStep>
                      ) : null}
                    </div>
                  ) : null}
                </ChatgptReasoning>
              ) : null}
              {searchSkipped ? (
                <p className="text-muted-foreground text-[14px] leading-6">
                  {OFFERING_SEARCH_SKIPPED_HINT}
                </p>
              ) : null}
              {phase === "thinking" && !showWorkedFor ? (
                <ChatgptThinking />
              ) : null}
              {phase === "searching" ? (
                <Shimmer className="text-[15px] leading-7 font-medium">
                  Searching the web
                </Shimmer>
              ) : null}
            </div>
          }
        >
          {answer.length > 0 ? (
            <MessageResponse
              className={cn(
                ANSWER_MARKDOWN_CLASS,
                geoAnswerMarkdownFontClass("chatgpt")
              )}
              components={ANSWER_COMPONENTS}
            >
              {answer}
            </MessageResponse>
          ) : null}
          {isSearch && state.result ? (
            <OfferingSources sources={state.result.sources} />
          ) : null}
        </ChatgptMessage>
      </div>
    </div>
  );
}
