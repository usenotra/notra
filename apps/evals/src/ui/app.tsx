import { useRenderer } from "@opentui/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { contenderFromId } from "../constants/contenders";
import { allPrices, type ModelPrice } from "../models/pricing";
import { type RunHandle, startRun } from "../runner/run-eval";
import { loadPickerSettings } from "../store/picker-settings";
import { listRuns, markInterrupted } from "../store/runs";
import { getSuite, SUITES } from "../suites/registry";
import type { AnySuite, EvalRun } from "../types/eval";
import type { PickerSettings } from "../types/picker";
import { HistoryScreen } from "./screens/history";
import { createHomeMemory, HomeScreen, type RunRequest } from "./screens/home";
import { PickerScreen } from "./screens/picker";
import { ResultsScreen } from "./screens/results";
import { RunScreen } from "./screens/run";

type Screen =
  | { name: "home" }
  | { name: "run" }
  | { name: "results"; run: EvalRun }
  | { name: "history"; runs: EvalRun[] }
  | {
      name: "picker";
      runs: EvalRun[];
      prices: Record<string, ModelPrice>;
      settings: PickerSettings;
    };

const VERIFY_REPEATS = 2;

const RENDER_THROTTLE_MS = 80;

export function App({
  initialDemo,
  initialSuiteId,
}: {
  initialDemo: boolean;
  initialSuiteId?: string;
}) {
  const renderer = useRenderer();
  const [demo, setDemo] = useState(initialDemo);
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [, setVersion] = useState(0);
  const handleRef = useRef<RunHandle | null>(null);
  const lastRender = useRef(0);
  const pendingRender = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSuiteId, setLastSuiteId] = useState(initialSuiteId);
  const homeMemory = useRef(createHomeMemory());

  // The runner mutates the run in place; re-render at most every 80 ms.
  const scheduleRender = useCallback(() => {
    const now = Date.now();
    if (now - lastRender.current >= RENDER_THROTTLE_MS) {
      lastRender.current = now;
      setVersion((value) => value + 1);
      return;
    }
    pendingRender.current ??= setTimeout(() => {
      pendingRender.current = null;
      lastRender.current = Date.now();
      setVersion((value) => value + 1);
    }, RENDER_THROTTLE_MS);
  }, []);

  useEffect(
    () => () => {
      handleRef.current?.cancel();
      if (pendingRender.current) {
        clearTimeout(pendingRender.current);
      }
    },
    []
  );

  const quit = useCallback(() => {
    handleRef.current?.cancel();
    renderer.destroy();
    process.exit(0);
  }, [renderer]);

  const launch = useCallback(
    (request: RunRequest) => {
      setLastSuiteId(request.suite.id);
      // Only one run is tracked; an older one would keep spending unseen.
      handleRef.current?.cancel();
      const handle = startRun({
        suite: request.suite,
        config: {
          suiteId: request.suite.id,
          contenders: request.contenders,
          repeats: request.repeats,
          concurrency: request.concurrency,
          demo,
        },
        onUpdate: scheduleRender,
      });
      handleRef.current = handle;
      setScreen({ name: "run" });
      handle.done.then(scheduleRender).catch(scheduleRender);
    },
    [demo, scheduleRender]
  );

  const retry = useCallback(
    (run: EvalRun) => {
      const suite = getSuite(run.config.suiteId);
      if (!suite) {
        return;
      }
      handleRef.current?.cancel();
      const handle = startRun({
        suite,
        config: run.config,
        onUpdate: scheduleRender,
        resume: run,
      });
      handleRef.current = handle;
      setScreen({ name: "run" });
      handle.done.then(scheduleRender).catch(scheduleRender);
    },
    [scheduleRender]
  );

  // Saved runs; any "running" one other than the live run was interrupted.
  const loadRuns = useCallback(async () => {
    const live = handleRef.current?.run;
    const activeId = live?.status === "running" ? live.id : undefined;
    return (await listRuns()).map((run) =>
      run.status === "running" && run.id !== activeId
        ? markInterrupted(run)
        : run
    );
  }, []);

  const openPicker = useCallback(async () => {
    const [runs, prices, settings] = await Promise.all([
      loadRuns(),
      allPrices(),
      loadPickerSettings(),
    ]);
    setScreen({ name: "picker", runs, prices, settings });
  }, [loadRuns]);

  const verify = useCallback(
    (suite: AnySuite, modelIds: string[]) =>
      launch({
        suite,
        contenders: modelIds.map(contenderFromId),
        repeats: VERIFY_REPEATS,
        concurrency: homeMemory.current.concurrency,
      }),
    [launch]
  );

  const openHistory = useCallback(async () => {
    setScreen({ name: "history", runs: await loadRuns() });
  }, [loadRuns]);

  if (screen.name === "run" && handleRef.current) {
    const { run } = handleRef.current;
    return (
      <RunScreen
        run={run}
        demo={run.config.demo}
        onCancel={() => handleRef.current?.cancel()}
        onResults={() => setScreen({ name: "results", run })}
        onBack={() => setScreen({ name: "home" })}
      />
    );
  }

  if (screen.name === "results") {
    return (
      <ResultsScreen
        run={screen.run}
        suite={getSuite(screen.run.config.suiteId)}
        demo={screen.run.config.demo}
        onBack={() =>
          setScreen(
            screen.run.status === "running" &&
              handleRef.current?.run === screen.run
              ? { name: "run" }
              : { name: "home" }
          )
        }
        onRetry={() => retry(screen.run)}
      />
    );
  }

  if (screen.name === "history") {
    return (
      <HistoryScreen
        runs={screen.runs}
        demo={demo}
        onOpen={(run) => setScreen({ name: "results", run })}
        onBack={() => setScreen({ name: "home" })}
      />
    );
  }

  if (screen.name === "picker") {
    return (
      <PickerScreen
        suites={SUITES}
        runs={screen.runs}
        prices={screen.prices}
        demo={demo}
        initialSettings={screen.settings}
        onVerify={verify}
        onOpenRun={(run) => setScreen({ name: "results", run })}
        onBack={() => setScreen({ name: "home" })}
      />
    );
  }

  return (
    <HomeScreen
      suites={SUITES}
      demo={demo}
      initialSuiteId={lastSuiteId}
      memory={homeMemory.current}
      onRun={launch}
      onHistory={openHistory}
      onPicker={openPicker}
      onToggleDemo={() => setDemo((value) => !value)}
      onQuit={quit}
    />
  );
}
