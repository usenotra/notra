"use client";

import { DraggableBlockPlugin_EXPERIMENTAL } from "@lexical/react/LexicalDraggableBlockPlugin";
import { GripVertical } from "lucide-react";
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
        className={`${DRAGGABLE_BLOCK_MENU_CLASSNAME} absolute top-0 left-0 cursor-grab rounded p-0.5 opacity-0 transition-opacity will-change-transform hover:bg-muted active:cursor-grabbing`}
        ref={menuRef}
      >
        <GripVertical className="size-4 text-muted-foreground" />
      </div>
    ),
    []
  );

  const targetLineComponent = useMemo(
    () => (
      <div
        className="pointer-events-none absolute top-0 left-0 h-1 w-full bg-primary opacity-0 will-change-transform"
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
