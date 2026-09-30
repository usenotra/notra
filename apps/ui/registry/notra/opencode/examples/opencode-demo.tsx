"use client";

import { Fragment, useLayoutEffect, useRef } from "react";

import { OpencodeActivity } from "../components/opencode-activity";
import { OpencodeComposer } from "../components/opencode-composer";
import { OpencodeMessage } from "../components/opencode-message";
import { OpencodeScrollArea } from "../components/opencode-scroll-area";
import { OpencodeSidebar } from "../components/opencode-sidebar";
import { OpencodeTurnFooter } from "../components/opencode-turn-footer";
import { OpencodeWindow } from "../components/opencode-window";
import {
  OPENCODE_DEMO_SESSION,
  OPENCODE_DEMO_TURNS,
} from "../constants/opencode-demo";
import type {
  OpencodeDemoActivity,
  OpencodeDemoBlock,
  OpencodeDemoSpan,
} from "../types/opencode";

const spanKey = (span: OpencodeDemoSpan, index: number) =>
  `${index}-${typeof span === "string" ? span : Object.values(span)[0]}`;

const Spans = ({ spans }: { spans: OpencodeDemoSpan[] }) =>
  spans.map((span, index) => {
    const key = spanKey(span, index);
    if (typeof span === "string") {
      return <Fragment key={key}>{span}</Fragment>;
    }
    if ("code" in span) {
      return <code key={key}>{span.code}</code>;
    }
    return <strong key={key}>{span.strong}</strong>;
  });

const ReplyBlock = ({ block }: { block: OpencodeDemoBlock }) => {
  if ("heading" in block) {
    return <h3>{block.heading}</h3>;
  }
  if ("items" in block) {
    return (
      <ul>
        {block.items.map((item) => (
          <li key={item.id}>
            <Spans spans={item.spans} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p>
      <Spans spans={block.text} />
    </p>
  );
};

/** Consecutive tool lines stack without a gap, thoughts stand alone. */
const groupActivities = (activities: OpencodeDemoActivity[]) =>
  activities.reduce<OpencodeDemoActivity[][]>((groups, activity) => {
    const last = groups.at(-1);
    const stacks =
      last && activity.kind !== "thought" && last[0]?.kind !== "thought";
    if (stacks) {
      last.push(activity);
    } else {
      groups.push([activity]);
    }
    return groups;
  }, []);

export default function OpencodeDemo() {
  const session = OPENCODE_DEMO_SESSION;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Open on the latest turn like a terminal. Scrolling the viewport directly
  // keeps the host page from jumping.
  useLayoutEffect(() => {
    const viewport = scrollRef.current?.querySelector(
      '[data-slot="opencode-scroll-area-viewport"]'
    );
    viewport?.scrollTo({ top: viewport.scrollHeight });
  }, []);

  return (
    <OpencodeWindow className="h-150">
      <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_minmax(16rem,30%)]">
        <div className="flex min-h-0 min-w-0 flex-col gap-[1lh] px-[2ch] pt-[1lh] pb-[0.5lh]">
          <OpencodeScrollArea className="min-h-0 flex-1" ref={scrollRef}>
            <div className="flex flex-col gap-[1lh] pr-[1.5ch]">
              {OPENCODE_DEMO_TURNS.map((turn) => (
                <Fragment key={turn.id}>
                  <OpencodeMessage from="user">{turn.prompt}</OpencodeMessage>
                  {groupActivities(turn.activities).map((group) => (
                    <div key={group[0]?.id}>
                      {group.map(({ id, ...activity }) => (
                        <OpencodeActivity key={id} {...activity} />
                      ))}
                    </div>
                  ))}
                  <OpencodeMessage>
                    {turn.reply.map((block) => (
                      <ReplyBlock block={block} key={block.id} />
                    ))}
                  </OpencodeMessage>
                  <OpencodeTurnFooter
                    agent={session.agent}
                    duration={turn.duration}
                    model={session.model}
                  />
                </Fragment>
              ))}
            </div>
          </OpencodeScrollArea>
          <OpencodeComposer
            agent={session.agent}
            context={session.context}
            cwd={session.cwd}
            effort={session.effort}
            model={session.model}
            placeholder=""
            provider={session.provider}
          />
        </div>
        <OpencodeSidebar
          branch={session.branch}
          className="hidden md:flex"
          cwd={session.cwd}
          servers={session.servers}
          spent={session.spent}
          title={session.title}
          tokens={session.tokens}
          used={session.used}
          version={session.version}
        />
      </div>
    </OpencodeWindow>
  );
}
