"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CLAUDE_CODE_CHAT_TIMING } from "../constants/claude-code";
import type {
  ClaudeCodeChat,
  ClaudeCodeChatTurn,
  ClaudeCodeReply,
  ClaudeCodeSessionTurn,
} from "../types/claude-code";

const WORD_PATTERN = /(\s+)/;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Rough English average, close enough for the spinner's token count. */
const CHARS_PER_TOKEN = 4;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const formatClock = (date: Date) =>
  date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const settle = (turn: ClaudeCodeSessionTurn): ClaudeCodeChatTurn => ({
  ...turn,
  status: "done",
});

/**
 * Runs the demo conversation: `send` appends your prompt, spins, runs the
 * reply's tool calls one by one, streams the answer and closes the turn with
 * a summary line. `stop` interrupts the running turn like Escape does.
 */
export const useClaudeCodeChat = (
  history: readonly ClaudeCodeSessionTurn[],
  replies: readonly ClaudeCodeReply[]
): ClaudeCodeChat => {
  const [turns, setTurns] = useState<ClaudeCodeChatTurn[]>(() =>
    history.map(settle)
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [spinnerVerb, setSpinnerVerb] = useState("");
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [streamed, setStreamed] = useState(0);
  const runRef = useRef(0);
  const activeRef = useRef<string | null>(null);
  const replyRef = useRef(0);

  useEffect(() => {
    if (!activeId) {
      return;
    }
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, CLAUDE_CODE_CHAT_TIMING.tickMs);
    return () => window.clearInterval(timer);
  }, [activeId]);

  useEffect(
    () => () => {
      runRef.current += 1;
    },
    []
  );

  const patch = useCallback(
    (
      id: string,
      next: (turn: ClaudeCodeChatTurn) => Partial<ClaudeCodeChatTurn>
    ) => {
      setTurns((current) =>
        current.map((turn) =>
          turn.id === id ? { ...turn, ...next(turn) } : turn
        )
      );
    },
    []
  );

  const finish = useCallback(() => {
    activeRef.current = null;
    setActiveId(null);
  }, []);

  const stop = useCallback(() => {
    const id = activeRef.current;
    if (!id) {
      return;
    }
    runRef.current += 1;
    patch(id, (turn) => ({
      commands: turn.commands.filter((command) => command.status !== "pending"),
      status: "interrupted",
    }));
    finish();
  }, [finish, patch]);

  const send = useCallback(
    async (text: string) => {
      const reply = replies[replyRef.current % replies.length];
      if (activeRef.current || !reply) {
        return;
      }
      replyRef.current += 1;
      const run = runRef.current + 1;
      runRef.current = run;
      const alive = () => runRef.current === run;
      const reduced = window.matchMedia(REDUCED_MOTION_QUERY).matches;
      const delay = (ms: number) =>
        wait(reduced ? Math.min(ms, CLAUDE_CODE_CHAT_TIMING.reducedMaxMs) : ms);
      const start = Date.now();
      const id = `turn-${start}`;

      activeRef.current = id;
      setActiveId(id);
      setStartedAt(start);
      setNow(start);
      setStreamed(0);
      setSpinnerVerb(reply.spinnerVerb);
      setTurns((current) => [
        ...current,
        { answer: "", commands: [], id, prompt: text, status: "working" },
      ]);

      await delay(CLAUDE_CODE_CHAT_TIMING.thinkMs);

      for (const command of reply.commands) {
        if (!alive()) {
          return;
        }
        const commandId = `${id}-${command.id}`;
        patch(id, (turn) => ({
          commands: [
            ...turn.commands,
            { ...command, id: commandId, status: "pending" },
          ],
        }));
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- tool calls run one after another
        await delay(CLAUDE_CODE_CHAT_TIMING.toolMs);
        if (!alive()) {
          return;
        }
        patch(id, (turn) => ({
          commands: turn.commands.map((item) =>
            item.id === commandId
              ? { ...item, status: command.status ?? "success" }
              : item
          ),
        }));
      }

      if (!alive()) {
        return;
      }
      patch(id, () => ({ status: "streaming" }));

      let answer = "";
      const words = reduced ? [reply.answer] : reply.answer.split(WORD_PATTERN);
      for (const word of words) {
        if (!alive()) {
          return;
        }
        answer += word;
        const snapshot = answer;
        patch(id, () => ({ answer: snapshot }));
        setStreamed(snapshot.length);
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- words stream in order
        await delay(CLAUDE_CODE_CHAT_TIMING.wordMs);
      }

      if (!alive()) {
        return;
      }
      const seconds = Math.max(1, Math.round((Date.now() - start) / 1000));
      patch(id, () => ({
        status: "done",
        summary: {
          doneAt: formatClock(new Date()),
          duration: `${seconds}s`,
          verb: reply.summaryVerb,
        },
      }));
      finish();
    },
    [finish, patch, replies]
  );

  return {
    busy: activeId !== null,
    elapsed: Math.max(0, Math.floor((now - startedAt) / 1000)),
    send,
    spinnerVerb,
    stop,
    tokens: Math.round(streamed / CHARS_PER_TOKEN),
    turns,
  };
};
