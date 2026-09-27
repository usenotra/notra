"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { getConnectedCardColumnClass } from "@notra/ui/lib/connected-cards";
import { cn } from "@notra/ui/lib/utils";

type ConnectedCardItem = {
  id: string;
  icon?: IconSvgElement;
  title: string;
  description?: string;
  docsLabel?: string;
  docsHref?: string;
  selectLabel?: string;
};

type ConnectedCardsProps = {
  items: ConnectedCardItem[];
  className?: string;
  onSelect?: (id: string) => void;
  onDocs?: (id: string) => void;
};

function PrimaryOverlay({
  item,
  onSelect,
}: {
  item: ConnectedCardItem;
  onSelect?: (id: string) => void;
}) {
  return (
    <button
      aria-label={item.selectLabel ?? `Create ${item.title} API key`}
      className="absolute inset-0 z-0 cursor-pointer rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-white/30"
      onClick={() => onSelect?.(item.id)}
      type="button"
    />
  );
}

function DocsAction({
  item,
  onDocs,
}: {
  item: ConnectedCardItem;
  onDocs?: (id: string) => void;
}) {
  const label = item.docsLabel ?? "View docs";
  const inner = (
    <>
      <span>{label}</span>
      <HugeiconsIcon className="size-3" icon={ArrowUpRight01Icon} />
    </>
  );
  const baseClass =
    "pointer-events-auto relative z-20 mt-auto inline-flex w-fit items-center gap-1 font-medium text-neutral-500 text-xs transition-colors hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-400 dark:hover:text-white dark:focus-visible:ring-white/30";

  if (item.docsHref) {
    return (
      <a
        className={baseClass}
        href={item.docsHref}
        onClick={(event) => event.stopPropagation()}
        rel="noopener noreferrer"
        target="_blank"
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      className={baseClass}
      onClick={(event) => {
        event.stopPropagation();
        onDocs?.(item.id);
      }}
      type="button"
    >
      {inner}
    </button>
  );
}

function ConnectedCards({ items, className, onSelect, onDocs }: ConnectedCardsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 divide-y divide-neutral-200/70 overflow-hidden rounded-2xl border border-neutral-200/70 bg-neutral-50 dark:divide-white/10 dark:border-white/10 dark:bg-white/5",
        getConnectedCardColumnClass(items.length),
        "sm:divide-x sm:divide-y-0",
        className
      )}
    >
      {items.map((item) => (
        <div
          className="group/cell relative flex flex-col gap-4 p-4 transition-colors hover:bg-neutral-100 dark:hover:bg-white/10"
          key={item.id}
        >
          <PrimaryOverlay item={item} onSelect={onSelect} />
          <div className="pointer-events-none relative z-10 flex flex-1 flex-col gap-4">
            {item.icon ? (
              <span className="inset-shadow-sm inset-shadow-white flex size-9 items-center justify-center rounded-lg bg-white text-neutral-700 shadow-black/5 shadow-sm ring-1 ring-black/5 dark:inset-shadow-white/8 dark:bg-white/10 dark:text-neutral-200 dark:ring-white/10">
                <HugeiconsIcon className="size-5" icon={item.icon} />
              </span>
            ) : null}
            <div className="space-y-1">
              <h3 className="font-medium text-neutral-950 text-sm dark:text-white">
                {item.title}
              </h3>
              {item.description ? (
                <p className="text-neutral-500 text-xs leading-relaxed dark:text-neutral-400">
                  {item.description}
                </p>
              ) : null}
            </div>
            <DocsAction item={item} onDocs={onDocs} />
          </div>
        </div>
      ))}
    </div>
  );
}

export { ConnectedCards };
export type { ConnectedCardItem, ConnectedCardsProps };
