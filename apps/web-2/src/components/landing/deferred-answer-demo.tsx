import { lazy, Suspense, useEffect, useRef, useState } from "react";

import type { DeferredAnswerDemoProps } from "@/types/landing/answer-demo";

const AnswerExampleDemo = lazy(() =>
  import("./answer-example-demo").then((module) => ({
    default: module.AnswerExampleDemo,
  }))
);

export function DeferredAnswerDemo({ children }: DeferredAnswerDemoProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="h-[40rem] min-w-0" ref={containerRef}>
      <Suspense fallback={children}>
        {shouldLoad ? <AnswerExampleDemo /> : children}
      </Suspense>
    </div>
  );
}
