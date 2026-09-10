import type { ReactNode } from "react";

export function MobileNavInert({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex w-full flex-col items-stretch justify-start"
      data-mobile-nav-inert=""
    >
      {children}
    </div>
  );
}
