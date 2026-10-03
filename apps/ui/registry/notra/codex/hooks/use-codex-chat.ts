"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CODEX_CHAT_TIMING } from "../constants/codex";
import type { CodexChat, CodexChatTurn, CodexReply } from "../types/codex";

const WORD_PATTERN = /(\s+)/;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

/**
 * Runs the demo conversation: `send` appends your prompt, works, runs the
 * reply's commands one by one and streams the answer. `stop` interrupts the
 * running turn like Escape does.
 */
export const useCodexChat = (replies: readonly CodexReply[]): CodexChat => {
  const [turns, setTurns] = useState<CodexChatTurn[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const runRef = useRef(0);
  const activeRef = useRef<string | null>(null);
  const replyRef = useRef(0);

  useEffect(() => {
    if (!activeId) {
      return;
    }
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, CODEX_CHAT_TIMING.tickMs);
    return () => window.clearInterval(timer);
  }, [activeId]);

  useEffect(
    () => () => {
      runRef.current += 1;
    },
    []
  );

  const patch = useCallback(
    (id: string, next: (turn: CodexChatTurn) => Partial<CodexChatTurn>) => {
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
      execs: turn.execs.filter((exec) => exec.status !== "running"),
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
        wait(reduced ? Math.min(ms, CODEX_CHAT_TIMING.reducedMaxMs) : ms);
      const start = Date.now();
      const id = `turn-${start}`;

      activeRef.current = id;
      setActiveId(id);
      setStartedAt(start);
      setNow(start);
      setTurns((current) => [
        ...current,
        { execs: [], id, prompt: text, reply: "", status: "working" },
      ]);

      await delay(CODEX_CHAT_TIMING.thinkMs);

      for (const exec of reply.execs) {
        if (!alive()) {
          return;
        }
        const execId = `${id}-${exec.id}`;
        patch(id, (turn) => ({
          execs: [
            ...turn.execs,
            { command: exec.command, id: execId, status: "running" },
          ],
        }));
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- commands run one after another
        await delay(CODEX_CHAT_TIMING.execMs);
        if (!alive()) {
          return;
        }
        patch(id, (turn) => ({
          execs: turn.execs.map((item) =>
            item.id === execId ? { ...exec, id: execId } : item
          ),
        }));
      }

      if (!alive()) {
        return;
      }
      patch(id, () => ({ status: "streaming" }));

      let answer = "";
      const words = reduced ? [reply.text] : reply.text.split(WORD_PATTERN);
      for (const word of words) {
        if (!alive()) {
          return;
        }
        answer += word;
        const snapshot = answer;
        patch(id, () => ({ reply: snapshot }));
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- words stream in order
        await delay(CODEX_CHAT_TIMING.wordMs);
      }

      if (!alive()) {
        return;
      }
      patch(id, () => ({ status: "done" }));
      finish();
    },
    [finish, patch, replies]
  );

  return {
    busy: activeId !== null,
    elapsed: Math.max(0, Math.floor((now - startedAt) / 1000)),
    send,
    stop,
    turns,
  };
};
