"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  OPENCODE_CHAT_TIMING,
  OPENCODE_REDUCED_MOTION_QUERY,
} from "../constants/opencode";
import type {
  OpencodeChat,
  OpencodeChatTurn,
  OpencodeDemoTurn,
  OpencodeReply,
} from "../types/opencode";

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const formatSeconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

const settle = (turn: OpencodeDemoTurn): OpencodeChatTurn => ({
  ...turn,
  status: "done",
});

/**
 * Runs the demo conversation: `send` appends your prompt, thinks, plays the
 * reply's tool lines and renders the answer block by block. `stop` interrupts
 * the running turn like Escape does.
 */
export const useOpencodeChat = (
  history: readonly OpencodeDemoTurn[],
  replies: readonly OpencodeReply[]
): OpencodeChat => {
  const [turns, setTurns] = useState<OpencodeChatTurn[]>(() =>
    history.map(settle)
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const runRef = useRef(0);
  const activeRef = useRef<string | null>(null);
  const replyRef = useRef(0);

  useEffect(
    () => () => {
      runRef.current += 1;
    },
    []
  );

  const patch = useCallback(
    (
      id: string,
      next: (turn: OpencodeChatTurn) => Partial<OpencodeChatTurn>
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
      activities: turn.activities.filter((activity) => !activity.running),
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
      const reduced = window.matchMedia(OPENCODE_REDUCED_MOTION_QUERY).matches;
      const delay = (ms: number) =>
        wait(reduced ? Math.min(ms, OPENCODE_CHAT_TIMING.reducedMaxMs) : ms);
      const start = Date.now();
      const id = `turn-${start}`;

      activeRef.current = id;
      setActiveId(id);
      setTurns((current) => [
        ...current,
        { activities: [], id, prompt: text, reply: [], status: "working" },
      ]);

      for (const activity of reply.activities) {
        if (!alive()) {
          return;
        }
        const activityId = `${id}-${activity.id}`;
        const isThought = activity.kind === "thought";
        const thoughtStart = Date.now();
        patch(id, (turn) => ({
          activities: [
            ...turn.activities,
            { ...activity, id: activityId, pending: isThought, running: true },
          ],
        }));
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- activity lines play one after another
        await delay(
          isThought ? OPENCODE_CHAT_TIMING.thinkMs : OPENCODE_CHAT_TIMING.toolMs
        );
        if (!alive()) {
          return;
        }
        const duration = isThought
          ? formatSeconds(Date.now() - thoughtStart)
          : activity.duration;
        patch(id, (turn) => ({
          activities: turn.activities.map((item) =>
            item.id === activityId
              ? { ...item, duration, pending: false, running: false }
              : item
          ),
        }));
      }

      if (!alive()) {
        return;
      }
      patch(id, () => ({ status: "streaming" }));

      for (const block of reply.reply) {
        if (!alive()) {
          return;
        }
        patch(id, (turn) => ({ reply: [...turn.reply, block] }));
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- blocks render in order
        await delay(OPENCODE_CHAT_TIMING.blockMs);
      }

      if (!alive()) {
        return;
      }
      patch(id, () => ({
        duration: formatSeconds(Date.now() - start),
        status: "done",
      }));
      finish();
    },
    [finish, patch, replies]
  );

  return { busy: activeId !== null, send, stop, turns };
};
