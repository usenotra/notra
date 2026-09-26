"use client";

import { GripVerticalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { DraggableBlockPlugin_EXPERIMENTAL } from "@lexical/react/LexicalDraggableBlockPlugin";
import { type ReactElement, useMemo, useRef } from "react";

const DRAGGABLE_BLOCK_MENU_CLASSNAME = "draggable-block-menu";

function isOnMenu(element: HTMLElement): boolean {
  return !!element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);
}

interface DraggableBlockPluginProps {
  anchorElem: HTMLElement;
}

export function DraggableBlockPlugin({
  anchorElem,
}: DraggableBlockPluginProps): ReactElement {
  const menuRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);

  const menuComponent = useMemo(
    () => (
      <div
        className={`${DRAGGABLE_BLOCK_MENU_CLASSNAME} hover:bg-muted absolute top-0 left-0 cursor-grab rounded p-0.5 opacity-0 transition-opacity will-change-transform active:cursor-grabbing`}
        ref={menuRef}
      >
        <HugeiconsIcon
          icon={GripVerticalIcon}
          className="text-muted-foreground size-4"
        />
      </div>
    ),
    []
  );

  const targetLineComponent = useMemo(
    () => (
      <div
        className="bg-primary pointer-events-none absolute top-0 left-0 h-1 w-full opacity-0 will-change-transform"
        ref={targetLineRef}
      />
    ),
    []
  );

  return (
    <DraggableBlockPlugin_EXPERIMENTAL
      anchorElem={anchorElem}
      isOnMenu={isOnMenu}
      menuComponent={menuComponent}
      menuRef={menuRef}
      targetLineComponent={targetLineComponent}
      targetLineRef={targetLineRef}
    />
  );
}
