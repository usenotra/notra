"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { deriveCodeResearchState } from "@/lib/design-system/code-research-playback";
import { buildCodeResearchScenarios } from "@/lib/design-system/code-research-scenarios";
import type { CodeResearchScenario } from "@/types/design-system/code-research";

const DEFAULT_SPEED = 1;

export function useCodeResearchPlayback() {
  const scenarios = useMemo(() => buildCodeResearchScenarios(), []);
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.id ?? "");
  const scenario =
    scenarios.find((entry) => entry.id === scenarioId) ?? scenarios[0];
  const steps = useMemo(() => scenario?.steps ?? [], [scenario]);
  const startAt = scenario?.startAt ?? 0;
  const [cursor, setCursor] = useState(startAt);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);

  const state = useMemo(
    () => deriveCodeResearchState(steps, cursor),
    [steps, cursor]
  );
  const isAtEnd = cursor >= steps.length;

  useEffect(() => {
    if (!isPlaying) {
      return;
    }
    const next = steps[cursor];
    if (!next) {
      setIsPlaying(false);
      return;
    }
    const timer = window.setTimeout(
      () => setCursor((value) => value + 1),
      next.delayMs / speed
    );
    return () => window.clearTimeout(timer);
  }, [cursor, isPlaying, speed, steps]);

  const selectScenario = useCallback(
    (id: string) => {
      const target = scenarios.find((entry) => entry.id === id);
      if (!target) {
        return;
      }
      setScenarioId(target.id);
      setCursor(target.startAt);
      setIsPlaying(false);
    },
    [scenarios]
  );

  const togglePlay = useCallback(() => {
    if (isAtEnd) {
      setCursor(startAt);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((value) => !value);
  }, [isAtEnd, startAt]);

  const stepForward = useCallback(() => {
    setIsPlaying(false);
    setCursor((value) => {
      // Skip over zero-delay bookkeeping steps so one click shows a visible change.
      let next = Math.min(value + 1, steps.length);
      while (next < steps.length && steps[next]?.delayMs === 0) {
        next += 1;
      }
      return next;
    });
  }, [steps]);

  const stepBack = useCallback(() => {
    setIsPlaying(false);
    setCursor((value) => Math.max(startAt, value - 1));
  }, [startAt]);

  const restart = useCallback(() => {
    setIsPlaying(false);
    setCursor(startAt);
  }, [startAt]);

  return {
    scenarios,
    scenario: scenario as CodeResearchScenario,
    state,
    cursor,
    startAt,
    totalSteps: steps.length,
    isPlaying,
    isAtEnd,
    speed,
    setSpeed,
    selectScenario,
    togglePlay,
    stepForward,
    stepBack,
    restart,
  };
}
