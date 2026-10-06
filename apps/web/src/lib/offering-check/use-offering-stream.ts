import { useMemo, useSyncExternalStore } from "react";

import { OFFERING_CHECK_API_PATH } from "@/constants/offering-check";
import { offeringStreamEventSchema } from "@/schemas/offering-check";
import type {
  OfferingCheckInput,
  OfferingCheckResult,
  OfferingFailureStatus,
  OfferingLiveState,
  OfferingQuestionKind,
  OfferingStreamEvent,
  OfferingThread,
} from "@/types/offering-check";
import { buildOfferingQuestions } from "@/utils/offering-check";
import { failureStatusFor } from "@/utils/offering-report";

type Action =
  | { type: "event"; event: OfferingStreamEvent }
  | { type: "failed"; status: OfferingFailureStatus };

function initialState(input: OfferingCheckInput): OfferingLiveState {
  return {
    status: "checking",
    threads: buildOfferingQuestions(input).map((question) => ({
      question,
      answer: "",
      reasoning: "",
      seconds: null,
      queries: [],
      domains: [],
      result: null,
    })),
    result: null,
  };
}

function settledState(result: OfferingCheckResult): OfferingLiveState {
  return {
    status: "done",
    threads: result.answers.map((answer) => ({
      question: { kind: answer.kind, text: answer.question },
      answer: answer.answer,
      reasoning: answer.reasoning,
      seconds: answer.seconds,
      queries: answer.queries,
      domains: answer.sources.map((source) => source.domain),
      result: answer,
    })),
    result,
  };
}

function updateThread(
  state: OfferingLiveState,
  kind: OfferingQuestionKind,
  update: (thread: OfferingThread) => OfferingThread
): OfferingLiveState {
  return {
    ...state,
    threads: state.threads.map((thread) =>
      thread.question.kind === kind ? update(thread) : thread
    ),
  };
}

function reduce(state: OfferingLiveState, action: Action): OfferingLiveState {
  if (action.type === "failed") {
    return { ...state, status: action.status };
  }
  const { event } = action;
  switch (event.type) {
    case "delta":
      return updateThread(state, event.kind, (thread) => ({
        ...thread,
        answer: thread.answer + event.text,
      }));
    case "reasoning":
      return updateThread(state, event.kind, (thread) => ({
        ...thread,
        reasoning: thread.reasoning + event.text,
      }));
    case "search":
      return updateThread(state, event.kind, (thread) => ({
        ...thread,
        queries: [...new Set([...thread.queries, ...event.queries])],
        domains: [...new Set([...thread.domains, ...event.domains])],
      }));
    case "answered":
      return updateThread(state, event.kind, (thread) => ({
        ...thread,
        seconds: event.seconds,
      }));
    case "result":
      return settledState(event.result);
    default:
      return { ...state, status: "error" };
  }
}

async function readEvents(
  response: Response,
  onEvent: (event: OfferingStreamEvent) => void
) {
  const reader = response.body?.getReader();
  if (!reader) {
    return;
  }
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const parsed = offeringStreamEventSchema.safeParse(
        line.trim().length > 0 ? JSON.parse(line) : null
      );
      if (parsed.success) {
        onEvent(parsed.data);
      }
    }
    if (done) {
      return;
    }
  }
}

async function streamOfferingCheck(
  input: OfferingCheckInput,
  signal: AbortSignal,
  onEvent: (event: OfferingStreamEvent) => void,
  onFailure: (status: OfferingFailureStatus) => void
) {
  const response = await fetch(OFFERING_CHECK_API_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  }).catch(() => null);
  if (signal.aborted) {
    return;
  }
  if (!response?.ok) {
    onFailure(await failureStatusFor(response));
    return;
  }

  let finished = false;
  await readEvents(response, (event) => {
    finished = finished || event.type === "result" || event.type === "error";
    onEvent(event);
  }).catch(() => null);
  if (!(finished || signal.aborted)) {
    onFailure("error");
  }
}

function createOfferingStreamStore(input: OfferingCheckInput) {
  let state = initialState(input);
  let start: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  const listeners = new Set<() => void>();
  const update = (action: Action) => {
    state = reduce(state, action);
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      if (!(start || controller)) {
        start = setTimeout(() => {
          start = null;
          controller = new AbortController();
          const { signal } = controller;
          void streamOfferingCheck(
            input,
            signal,
            (event) => {
              if (!signal.aborted) {
                update({ type: "event", event });
              }
            },
            (status) => update({ type: "failed", status })
          );
        }, 0);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          if (start) {
            clearTimeout(start);
            start = null;
          }
          controller?.abort();
          controller = null;
        }
      };
    },
  };
}

export function useOfferingStream(
  input: OfferingCheckInput
): OfferingLiveState {
  const { domain, feature, problem } = input;
  const store = useMemo(
    () => createOfferingStreamStore({ domain, feature, problem }),
    [domain, feature, problem]
  );
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
}
