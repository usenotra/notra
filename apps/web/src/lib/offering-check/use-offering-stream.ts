"use client";

import { useEffect, useReducer, useRef } from "react";

import { OFFERING_CHECK_API_PATH } from "@/constants/offering-check";
import { offeringStreamEventSchema } from "@/schemas/offering-check";
import type {
  OfferingCheckInput,
  OfferingCheckResult,
  OfferingLiveState,
  OfferingReportStatus,
  OfferingStreamEvent,
} from "@/types/offering-check";

type Action =
  | { type: "event"; event: OfferingStreamEvent }
  | { type: "failed"; status: OfferingReportStatus };

const STATUS_BY_RESPONSE: Partial<Record<number, OfferingReportStatus>> = {
  429: "rate-limited",
  503: "unavailable",
};

function initialState(result: OfferingCheckResult | null): OfferingLiveState {
  return {
    status: result ? "done" : "checking",
    answers: {
      memory: result?.memory.answer ?? "",
      search: result?.search.answer ?? "",
    },
    reasoning: {
      memory: result?.memory.reasoning ?? "",
      search: result?.search.reasoning ?? "",
    },
    seconds: {
      memory: result?.memory.seconds ?? null,
      search: result?.search.seconds ?? null,
    },
    queries: result?.queries ?? [],
    domains: result?.sources.map((source) => source.domain) ?? [],
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
        answers: {
          ...state.answers,
          [event.mode]: state.answers[event.mode] + event.text,
        },
      };
    case "reasoning":
      return {
        ...state,
        reasoning: {
          ...state.reasoning,
          [event.mode]: state.reasoning[event.mode] + event.text,
        },
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
        seconds: { ...state.seconds, [event.mode]: event.seconds },
      };
    case "result":
      return initialState(event.result);
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

export function useOfferingStream(
  input: OfferingCheckInput,
  initialResult: OfferingCheckResult | null
): OfferingLiveState {
  const [state, dispatch] = useReducer(reduce, initialResult, initialState);
  const startedRef = useRef(false);
  const { domain, feature, description } = input;

  useEffect(() => {
    if (initialResult || startedRef.current) {
      return;
    }
    startedRef.current = true;

    const run = async () => {
      const response = await fetch(OFFERING_CHECK_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, feature, description }),
      }).catch(() => null);
      if (!response?.ok) {
        dispatch({
          type: "failed",
          status: STATUS_BY_RESPONSE[response?.status ?? 0] ?? "error",
        });
        return;
      }
      let finished = false;
      await readEvents(response, (event) => {
        finished =
          finished || event.type === "result" || event.type === "error";
        dispatch({ type: "event", event });
      }).catch(() => null);
      if (!finished) {
        dispatch({ type: "failed", status: "error" });
      }
    };
    run();
  }, [domain, feature, description, initialResult]);

  return state;
}
