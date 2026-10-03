import { useMemo, useSyncExternalStore } from "react";

import { OFFERING_CHECK_API_PATH } from "@/constants/offering-check";
import { offeringStreamEventSchema } from "@/schemas/offering-check";
import type {
  OfferingCheckInput,
  OfferingCheckResult,
  OfferingLiveState,
  OfferingFailureStatus,
  OfferingStreamEvent,
} from "@/types/offering-check";
import {
  failureStatusFor,
  readOfferingDescription,
} from "@/utils/offering-report";

type Action =
  | { type: "event"; event: OfferingStreamEvent }
  | { type: "failed"; status: OfferingFailureStatus };

const INITIAL_STATE: OfferingLiveState = {
  status: "checking",
  answer: "",
  reasoning: "",
  seconds: null,
  queries: [],
  domains: [],
  result: null,
};

function settledState(result: OfferingCheckResult): OfferingLiveState {
  return {
    status: "done",
    answer: result.answer,
    reasoning: result.reasoning,
    seconds: result.seconds,
    queries: result.queries,
    domains: result.sources.map((source) => source.domain),
    result,
  };
}

function reduce(state: OfferingLiveState, action: Action): OfferingLiveState {
  if (action.type === "failed") {
    return { ...state, status: action.status };
  }
  const { event } = action;
  switch (event.type) {
    case "delta":
      return {
        ...state,
        answer: state.answer + event.text,
      };
    case "reasoning":
      return {
        ...state,
        reasoning: state.reasoning + event.text,
      };
    case "search":
      return {
        ...state,
        queries: [...new Set([...state.queries, ...event.queries])],
        domains: [...new Set([...state.domains, ...event.domains])],
      };
    case "answered":
      return {
        ...state,
        seconds: event.seconds,
      };
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
  // The optional description never goes into the shareable URL, so it is
  // picked up from this tab's session when the check starts.
  const response = await fetch(OFFERING_CHECK_API_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      description: readOfferingDescription(input),
    }),
    signal,
  }).catch(() => null);
  if (signal.aborted) {
    return;
  }
  if (!response?.ok) {
    onFailure(failureStatusFor(response?.status));
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
  let state = INITIAL_STATE;
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
  const { domain, feature, description } = input;
  const store = useMemo(
    () => createOfferingStreamStore({ domain, feature, description }),
    [domain, feature, description]
  );
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
}
