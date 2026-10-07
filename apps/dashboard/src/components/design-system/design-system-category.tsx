import type { ReactNode } from "react";

import { DESIGN_SYSTEM_CATEGORY_BY_ID } from "@/constants/design-system-catalog";

export function DesignSystemCategory({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const category = DESIGN_SYSTEM_CATEGORY_BY_ID[id];

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-10 flex-col gap-16"
      id={id}
    >
      <header className="border-border space-y-2 border-t pt-10">
        <h2
          className="text-3xl font-semibold tracking-tight text-balance"
          id={`${id}-title`}
        >
          {category?.label}
        </h2>
        <p className="text-muted-foreground max-w-2xl text-base text-pretty">
          {category?.description}
        </p>
      </header>
      {children}
    </section>
  );
}
