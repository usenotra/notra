"use client";

import { useEffect, useRef, useState } from "react";

export function useChatActivityTimer(
  isRunning: boolean,
  chatId: string,
  responseId: string | undefined
): number | undefined {
  const startedAt = useRef<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [measuredChatId, setMeasuredChatId] = useState<string | undefined>();
  const [measuredResponseId, setMeasuredResponseId] = useState<
    string | undefined
  >();

  useEffect(() => {
    if (isRunning) {
      setMeasuredResponseId(responseId);
    }
  }, [isRunning, responseId]);

  useEffect(() => {
    if (!isRunning) {
      if (startedAt.current !== null) {
        setSeconds(
          Math.max(1, Math.ceil((Date.now() - startedAt.current) / 1000))
        );
      }
      startedAt.current = null;
      setHasStarted(false);
      return;
    }

    startedAt.current = Date.now();
    setMeasuredChatId(chatId);
    setSeconds(0);
    setHasStarted(true);
    const interval = window.setInterval(() => {
      setSeconds(
        Math.floor((Date.now() - (startedAt.current ?? Date.now())) / 1000)
      );
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning, chatId]);

  if (isRunning) {
    return !hasStarted || measuredChatId !== chatId ? 0 : seconds;
  }
  return measuredChatId === chatId &&
    measuredResponseId === responseId &&
    responseId !== undefined
    ? seconds
    : undefined;
}
