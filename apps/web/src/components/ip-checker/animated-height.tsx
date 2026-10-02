import { useLayoutEffect, useRef, useState } from "react";

import type { AnimatedHeightProps } from "@/types/ip-checker";

export function AnimatedHeight({ children, className }: AnimatedHeightProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = contentRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setHeight(entry.contentRect.height);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${className ?? ""}`}
      style={{ height: height ?? "auto" }}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
}
