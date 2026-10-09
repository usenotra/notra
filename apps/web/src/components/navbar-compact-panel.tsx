import { HugeiconsIcon } from "@hugeicons/react";

import { NavbarHref } from "@/components/navbar-href";
import type { NavbarCompactPanelProps } from "@/types/navbar";

export function NavbarCompactPanel({
  group,
  onSelect,
  role,
}: NavbarCompactPanelProps) {
  return (
    <div className="w-88 max-w-full p-2">
      <div className="flex flex-col gap-1">
        {group.rail.map((item) => (
          <NavbarHref
            className="text-foreground hover:bg-accent focus-visible:bg-accent focus-visible:outline-ring flex items-start gap-3 rounded-lg px-3 py-2.5 font-sans transition-colors focus-visible:outline-2"
            external={item.external}
            href={item.href}
            key={item.href}
            onClick={onSelect}
            role={role}
          >
            <span className="border-border mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border">
              <HugeiconsIcon
                aria-hidden="true"
                className="size-4"
                icon={item.icon}
                strokeWidth={1.5}
              />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-base leading-6">{item.label}</span>
              <span className="text-muted-foreground text-sm leading-5">
                {item.description}
              </span>
            </span>
          </NavbarHref>
        ))}
      </div>
    </div>
  );
}
