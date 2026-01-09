"use client";

import { DraggableBlockPlugin_EXPERIMENTAL } from "@lexical/react/LexicalDraggableBlockPlugin";
import { GripVertical } from "lucide-react";
import { useRef } from "react";

const DRAGGABLE_BLOCK_MENU_CLASSNAME = "draggable-block-menu";

function isOnMenu(element: HTMLElement): boolean {
  return !!element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);
}

function DraggableBlockMenu({
  menuRef,
  isEditable,
}: {
  menuRef: React.RefObject<HTMLDivElement | null>;
  isEditable: boolean;
}) {
  if (!isEditable) {
    return null;
  }

  return (
    <div
      className={`${DRAGGABLE_BLOCK_MENU_CLASSNAME} absolute top-0 left-0 cursor-grab rounded p-0.5 opacity-0 transition-opacity will-change-transform hover:bg-muted active:cursor-grabbing`}
      ref={menuRef}
    >
      <GripVertical className="size-4 text-muted-foreground" />
    </div>
  );
}

function TargetLine({
  targetLineRef,
}: {
  targetLineRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      className="pointer-events-none absolute top-0 left-0 h-1 w-full bg-primary opacity-0 will-change-transform"
      ref={targetLineRef}
    />
  );
}

interface DraggableBlockPluginProps {
  anchorElem?: HTMLElement;
  isEditable?: boolean;
}

export function DraggableBlockPlugin({
  anchorElem,
  isEditable = true,
}: DraggableBlockPluginProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);

  if (!isEditable) {
    return null;
  }

  return (
    <DraggableBlockPlugin_EXPERIMENTAL
      anchorElem={anchorElem}
      isOnMenu={isOnMenu}
      menuComponent={
        <DraggableBlockMenu isEditable={isEditable} menuRef={menuRef} />
      }
      menuRef={menuRef}
      targetLineComponent={<TargetLine targetLineRef={targetLineRef} />}
      targetLineRef={targetLineRef}
    />
  );
}
