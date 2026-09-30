"use client";

import { Fragment, useEffect, useRef } from "react";

import { CodexComposer } from "../components/codex-composer";
import { CodexExec } from "../components/codex-exec";
import { CodexExplored } from "../components/codex-explored";
import { CodexHeader } from "../components/codex-header";
import { CodexCode, CodexList, CodexTable } from "../components/codex-markdown";
import { CodexMessage } from "../components/codex-message";
import { CodexTerminal } from "../components/codex-terminal";
import { CodexInterrupted, CodexWorking } from "../components/codex-working";
import { CODEX_DEMO_SESSION, CODEX_REPLIES } from "../constants/codex-demo";
import { useCodexChat } from "../hooks/use-codex-chat";
import type { CodexChatTurn } from "../types/codex";

const PARAGRAPH_SEPARATOR = "\n\n";

/** How close to the bottom still counts as following the transcript. */
const FOLLOW_THRESHOLD_PX = 48;

const CODE_PATTERN = /(`[^`]+`)/;

/** Renders one paragraph, turning `backticks` into code. */
const CodexInline = ({ text }: { text: string }) => {
  let offset = 0;
  return text.split(CODE_PATTERN).map((part) => {
    const key = `${offset}-${part}`;
    offset += part.length;
    return part.length > 2 && part.startsWith("`") && part.endsWith("`") ? (
      <CodexCode key={key}>{part.slice(1, -1)}</CodexCode>
    ) : (
      <Fragment key={key}>{part}</Fragment>
    );
  });
};

const CodexTurn = ({ turn }: { turn: CodexChatTurn }) => {
  let offset = 0;
  const paragraphs = turn.reply.split(PARAGRAPH_SEPARATOR).map((text) => {
    const key = offset;
    offset += text.length + PARAGRAPH_SEPARATOR.length;
    return { key, text };
  });

  return (
    <>
      <CodexMessage from="user">{turn.prompt}</CodexMessage>
      {turn.execs.map(({ id, ...exec }) => (
        <CodexExec key={id} {...exec} />
      ))}
      {turn.reply && (
        <CodexMessage>
          {paragraphs.map((paragraph) => (
            <p key={paragraph.key}>
              <CodexInline text={paragraph.text} />
            </p>
          ))}
        </CodexMessage>
      )}
      {turn.status === "interrupted" && <CodexInterrupted />}
    </>
  );
};

export default function CodexDemo() {
  const session = CODEX_DEMO_SESSION;
  const chat = useCodexChat(CODEX_REPLIES);
  const terminalRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(false);

  // Follow new output only while the reader sits at the bottom, so
  // scrolling up to reread a turn is not undone by the next streamed word.
  // Sending always jumps back down. Scrolling the viewport directly (not
  // scrollIntoView) keeps the host page still.
  const viewportOf = () =>
    terminalRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );

  useEffect(() => {
    const viewport = viewportOf();
    if (!viewport) {
      return;
    }
    const handleScroll = () => {
      followRef.current =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
        FOLLOW_THRESHOLD_PX;
    };
    handleScroll();
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!followRef.current) {
      return;
    }
    const viewport = viewportOf();
    viewport?.scrollTo({ top: viewport.scrollHeight });
  }, [chat.turns, chat.busy]);

  const handleSend = (text: string) => {
    followRef.current = true;
    return chat.send(text);
  };

  return (
    <div className="w-full min-w-0">
      <CodexTerminal
        className="h-170"
        footer={
          <>
            {chat.busy && (
              <CodexWorking
                className="pb-[0.65em]"
                elapsed={`${chat.elapsed}s`}
              />
            )}
            <CodexComposer
              busy={chat.busy}
              cwd={session.header.cwd}
              effort={session.composer.effort}
              model={session.composer.model}
              onSend={handleSend}
              onStop={chat.stop}
              placeholder={session.composer.placeholder}
              task={session.composer.task}
              warnings={session.composer.warnings}
            />
          </>
        }
        ref={terminalRef}
        title={session.title}
      >
        <CodexHeader {...session.header} />
        <CodexMessage from="user">{session.userMessage}</CodexMessage>
        <CodexMessage>{session.intro}</CodexMessage>
        <CodexExec {...session.exec} />
        <CodexExplored
          details={session.exploredDetails}
          items={session.explored}
        />
        <CodexMessage>
          <p>{session.summary}</p>
          <CodexList
            items={session.highlights.map((highlight) => (
              <Fragment key={highlight.id}>
                <strong>{highlight.label}</strong> {highlight.text}
              </Fragment>
            ))}
          />
          <p>{session.tableIntro}</p>
          <CodexTable codeColumns={[0]} {...session.table} />
          <p>{session.followUp}</p>
        </CodexMessage>
        {chat.turns.map((turn) => (
          <CodexTurn key={turn.id} turn={turn} />
        ))}
      </CodexTerminal>
    </div>
  );
}
