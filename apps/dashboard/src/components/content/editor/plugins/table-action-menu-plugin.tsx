"use client";

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Delete02Icon,
  LayoutThreeColumnIcon,
  LayoutThreeRowIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $getTableCellNodeFromLexicalNode,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableNode,
} from "@lexical/table";
import { mergeRegister } from "@lexical/utils";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface TableActionMenuProps {
  editor: ReturnType<typeof useLexicalComposerContext>[0];
  anchorElem: HTMLElement;
  cellDOMNode: HTMLElement;
}

function TableActionMenu({
  editor,
  anchorElem,
  cellDOMNode,
}: TableActionMenuProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) {
      return;
    }

    const cellRect = cellDOMNode.getBoundingClientRect();
    const anchorRect = anchorElem.getBoundingClientRect();
    const toolbarHeight = toolbar.offsetHeight;

    const spaceAbove = cellRect.top - anchorRect.top;
    const minSpaceNeeded = toolbarHeight + 8;

    let top: number;
    if (spaceAbove < minSpaceNeeded) {
      top = cellRect.bottom - anchorRect.top + 4;
    } else {
      top = cellRect.top - anchorRect.top - toolbarHeight - 4;
    }

    let left =
      cellRect.left -
      anchorRect.left +
      cellRect.width / 2 -
      toolbar.offsetWidth / 2;

    const maxLeft = anchorRect.width - toolbar.offsetWidth;
    left = Math.max(0, Math.min(left, maxLeft));

    toolbar.style.top = `${top}px`;
    toolbar.style.left = `${left}px`;
    toolbar.style.opacity = "1";
  }, [anchorElem, cellDOMNode]);

  useEffect(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
    };
  }, [updatePosition]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      editor.getEditorState().read(() => {
        updatePosition();
      });
    });
  }, [editor, updatePosition]);

  const insertRowAbove = useCallback(() => {
    editor.update(() => {
      $insertTableRowAtSelection(false);
    });
  }, [editor]);

  const insertRowBelow = useCallback(() => {
    editor.update(() => {
      $insertTableRowAtSelection(true);
    });
  }, [editor]);

  const insertColumnBefore = useCallback(() => {
    editor.update(() => {
      $insertTableColumnAtSelection(false);
    });
  }, [editor]);

  const insertColumnAfter = useCallback(() => {
    editor.update(() => {
      $insertTableColumnAtSelection(true);
    });
  }, [editor]);

  const deleteRow = useCallback(() => {
    editor.update(() => {
      $deleteTableRowAtSelection();
    });
  }, [editor]);

  const deleteColumn = useCallback(() => {
    editor.update(() => {
      $deleteTableColumnAtSelection();
    });
  }, [editor]);

  const deleteTable = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return;
      }
      const anchor = selection.anchor.getNode();
      const cellNode = $getTableCellNodeFromLexicalNode(anchor);
      if (!cellNode) {
        return;
      }
      let current = cellNode.getParent();
      while (current && !$isTableNode(current)) {
        current = current.getParent();
      }
      if (current && $isTableNode(current)) {
        current.remove();
      }
    });
  }, [editor]);

  const buttonClass =
    "p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground";

  return (
    <div
      className="bg-popover absolute z-50 flex items-center gap-0.5 rounded-lg border p-1 opacity-0 shadow-lg transition-opacity"
      ref={toolbarRef}
      role="toolbar"
      style={{ pointerEvents: "auto" }}
    >
      <button
        aria-label="Insert row above"
        className={buttonClass}
        onClick={insertRowAbove}
        title="Insert row above"
        type="button"
      >
        <HugeiconsIcon icon={ArrowUp01Icon} className="size-4" />
      </button>
      <button
        aria-label="Insert row below"
        className={buttonClass}
        onClick={insertRowBelow}
        title="Insert row below"
        type="button"
      >
        <HugeiconsIcon icon={ArrowDown01Icon} className="size-4" />
      </button>
      <button
        aria-label="Insert column before"
        className={buttonClass}
        onClick={insertColumnBefore}
        title="Insert column before"
        type="button"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
      </button>
      <button
        aria-label="Insert column after"
        className={buttonClass}
        onClick={insertColumnAfter}
        title="Insert column after"
        type="button"
      >
        <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
      </button>
      <div className="bg-border mx-0.5 h-4 w-px" />
      <button
        aria-label="Delete row"
        className={buttonClass}
        onClick={deleteRow}
        title="Delete row"
        type="button"
      >
        <HugeiconsIcon icon={LayoutThreeRowIcon} className="size-4" />
      </button>
      <button
        aria-label="Delete column"
        className={buttonClass}
        onClick={deleteColumn}
        title="Delete column"
        type="button"
      >
        <HugeiconsIcon icon={LayoutThreeColumnIcon} className="size-4" />
      </button>
      <button
        aria-label="Delete table"
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded p-1.5 transition-colors"
        onClick={deleteTable}
        title="Delete table"
        type="button"
      >
        <HugeiconsIcon icon={Delete02Icon} className="size-4" />
      </button>
    </div>
  );
}

interface TableActionMenuPluginProps {
  anchorElem: HTMLElement;
}

export function TableActionMenuPlugin({
  anchorElem,
}: TableActionMenuPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [tableCellDOMNode, setTableCellDOMNode] = useState<HTMLElement | null>(
    null
  );

  const updateMenu = useCallback(() => {
    editor.getEditorState().read(() => {
      if (editor.isComposing()) {
        return;
      }

      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        setTableCellDOMNode(null);
        return;
      }

      const anchor = selection.anchor.getNode();
      const cellNode = $getTableCellNodeFromLexicalNode(anchor);
      if (!cellNode) {
        setTableCellDOMNode(null);
        return;
      }

      const cellDOMNode = editor.getElementByKey(cellNode.getKey());
      if (!cellDOMNode) {
        setTableCellDOMNode(null);
        return;
      }
      setTableCellDOMNode(cellDOMNode);
    });
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(() => {
        updateMenu();
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateMenu();
          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor, updateMenu]);

  if (!tableCellDOMNode) {
    return null;
  }

  return createPortal(
    <TableActionMenu
      anchorElem={anchorElem}
      cellDOMNode={tableCellDOMNode}
      editor={editor}
    />,
    anchorElem
  );
}
