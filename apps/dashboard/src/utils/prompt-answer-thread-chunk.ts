import { createElement } from "react";

import type { GeoPromptAnswerThread } from "@/components/geo/geo-prompt-answer-thread";
import type { GeoPromptAnswerThreadProps } from "@/types/geo";

let loadedThread: typeof GeoPromptAnswerThread | undefined;

/**
 * The raw answer thread's code (markdown renderer). Lives outside hooks and
 * components: React Compiler can't compile a function that contains `import()`.
 */
export function loadGeoPromptAnswerThread() {
  return import("@/components/geo/geo-prompt-answer-thread").then((module) => {
    loadedThread = module.GeoPromptAnswerThread;
    return module;
  });
}

/**
 * The thread rendered without Suspense once a load has finished, or `null`
 * before that. React.lazy suspends on first render even for a loaded chunk,
 * and React holds a Suspense fallback for ~300 ms.
 */
export function renderLoadedGeoPromptAnswerThread(
  props: GeoPromptAnswerThreadProps
) {
  return loadedThread ? createElement(loadedThread, props) : null;
}
