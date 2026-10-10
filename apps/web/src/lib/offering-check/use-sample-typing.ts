import { useEffect, useRef, useState } from "react";

import {
  OFFERING_SAMPLE_FIELDS,
  OFFERING_SAMPLE_PAUSE_CHARACTER,
  OFFERING_SAMPLE_TYPING,
} from "@/constants/offering-check";
import type {
  OfferingSampleField,
  OfferingSampleValues,
  OfferingTypingFrame,
} from "@/types/offering-check";
import { getReducedMotionSnapshot } from "@/utils/reduced-motion";

/** Small, repeatable variation so the typing does not tick like a metronome. */
function keystrokeDelay(character: string, base: number): number {
  const jitter = (character.charCodeAt(0) * 7) % 5;
  const pause = OFFERING_SAMPLE_PAUSE_CHARACTER.test(character)
    ? OFFERING_SAMPLE_TYPING.wordPauseMs
    : 0;
  return base + jitter * OFFERING_SAMPLE_TYPING.jitterStepMs + pause;
}

/** Erases what is there, then types each field in turn with short pauses. */
function buildFrames(
  from: OfferingSampleValues,
  to: OfferingSampleValues
): OfferingTypingFrame[] {
  const frames: OfferingTypingFrame[] = [];
  const current = { ...from };
  let at = 0;
  const push = (field: OfferingSampleField, delay: number) => {
    at += delay;
    frames.push({ values: { ...current }, field, at });
  };

  for (const field of [...OFFERING_SAMPLE_FIELDS].reverse()) {
    const step = Math.max(
      1,
      Math.ceil(current[field].length / OFFERING_SAMPLE_TYPING.eraseSteps)
    );
    while (current[field].length > 0) {
      current[field] = current[field].slice(0, -step);
      push(field, OFFERING_SAMPLE_TYPING.eraseMs);
    }
  }

  for (const field of OFFERING_SAMPLE_FIELDS) {
    const target = to[field];
    const base =
      field === "problem"
        ? OFFERING_SAMPLE_TYPING.problemKeyMs
        : OFFERING_SAMPLE_TYPING.keyMs;
    for (let index = 0; index < target.length; index += 1) {
      current[field] = target.slice(0, index + 1);
      push(
        field,
        index === 0
          ? OFFERING_SAMPLE_TYPING.fieldPauseMs
          : keystrokeDelay(target.charAt(index - 1), base)
      );
    }
  }
  return frames;
}

/**
 * Types a sample into the form like a person would: clears the old text,
 * then fills domain, feature and problem one after another. Returns the
 * field being typed so it can look focused without stealing focus.
 */
export function useSampleTyping(
  current: OfferingSampleValues,
  apply: (values: OfferingSampleValues) => void
) {
  const frame = useRef<number | null>(null);
  const target = useRef<OfferingSampleValues | null>(null);
  const [typingField, setTypingField] = useState<OfferingSampleField | null>(
    null
  );

  const cancel = () => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
  };

  useEffect(() => cancel, []);

  /** Stops typing where it is, e.g. when the visitor types themselves. */
  const stopTyping = () => {
    if (frame.current === null) {
      return;
    }
    cancel();
    target.current = null;
    setTypingField(null);
  };

  /**
   * Jumps to the end of a running example and returns its full values, so a
   * submit mid-animation sends the whole sample instead of half of it.
   */
  const finishTyping = (): OfferingSampleValues | null => {
    const values = frame.current === null ? null : target.current;
    stopTyping();
    if (values) {
      apply(values);
    }
    return values;
  };

  // Driven by elapsed time, so slow renders skip characters instead of
  // stretching the whole animation.
  const typeSample = (sample: OfferingSampleValues) => {
    cancel();
    target.current = sample;
    if (getReducedMotionSnapshot()) {
      apply(sample);
      setTypingField(null);
      return;
    }
    const frames = buildFrames(current, sample);
    const startedAt = performance.now();
    let shown = -1;
    const tick = (now: number) => {
      const elapsed = now - startedAt;
      let next = shown;
      while (
        next + 1 < frames.length &&
        (frames[next + 1]?.at ?? 0) <= elapsed
      ) {
        next += 1;
      }
      const due = frames[next];
      if (next !== shown && due) {
        shown = next;
        apply(due.values);
        setTypingField(due.field);
      }
      if (shown >= frames.length - 1) {
        frame.current = null;
        target.current = null;
        setTypingField(null);
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  return { typeSample, stopTyping, finishTyping, typingField };
}
