"use client";

import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import {
  Bold,
  Code,
  Italic,
  Link,
  Strikethrough,
  Underline,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface FloatingToolbarProps {
  editor: ReturnType<typeof useLexicalComposerContext>[0];
  anchorElem: HTMLElement;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrikethrough: boolean;
  isCode: boolean;
  isLink: boolean;
}

function FloatingToolbar({
  editor,
  anchorElem,
  isBold,
  isItalic,
  isUnderline,
  isStrikethrough,
  isCode,
  isLink,
}: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const selection = window.getSelection();
    const toolbar = toolbarRef.current;

    if (
      !selection ||
      selection.isCollapsed ||
      selection.rangeCount === 0 ||
      !toolbar
    ) {
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const anchorRect = anchorElem.getBoundingClientRect();

    // Constrain top to minimum of 8px to prevent toolbar going off-screen
    const top = Math.max(
      8,
      rect.top - anchorRect.top - toolbar.offsetHeight - 8
    );
    let left =
      rect.left - anchorRect.left + rect.width / 2 - toolbar.offsetWidth / 2;

    const maxLeft = anchorRect.width - toolbar.offsetWidth;
    left = Math.max(0, Math.min(left, maxLeft));

    toolbar.style.top = `${top}px`;
    toolbar.style.left = `${left}px`;
    toolbar.style.opacity = "1";
  }, [anchorElem]);

  useEffect(() => {
    updatePosition();

    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();

    // Listen to both window and anchorElem scroll events
    // Window scroll is needed because getBoundingClientRect() returns viewport-relative coords
    // AnchorElem scroll captures scrolling within the editor container
    window.addEventListener("scroll", handleScroll);
    anchorElem.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      anchorElem.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [anchorElem, updatePosition]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(() => {
        editor.getEditorState().read(() => {
          updatePosition();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updatePosition();
          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor, updatePosition]);

  const insertLink = useCallback(() => {
    if (isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    } else {
      const url = prompt("Enter URL:", "https://");
      // Validate URL is not empty or just the placeholder
      if (url !== null && url.trim() !== "" && url.trim() !== "https://") {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url.trim());
      }
    }
  }, [editor, isLink]);

  const buttonClass = (active: boolean) =>
    `p-1.5 rounded hover:bg-muted transition-colors ${active ? "bg-muted text-primary" : "text-muted-foreground"}`;

  return (
    <div
      className="absolute z-50 flex items-center gap-0.5 rounded-lg border bg-popover p-1 opacity-0 shadow-lg transition-opacity"
      ref={toolbarRef}
      role="toolbar"
      style={{ pointerEvents: "auto" }}
    >
      <button
        aria-label="Format bold"
        className={buttonClass(isBold)}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        title="Bold (Ctrl+B)"
        type="button"
      >
        <Bold className="size-4" />
      </button>
      <button
        aria-label="Format italic"
        className={buttonClass(isItalic)}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        title="Italic (Ctrl+I)"
        type="button"
      >
        <Italic className="size-4" />
      </button>
      <button
        aria-label="Format underline"
        className={buttonClass(isUnderline)}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        title="Underline (Ctrl+U)"
        type="button"
      >
        <Underline className="size-4" />
      </button>
      <button
        aria-label="Format strikethrough"
        className={buttonClass(isStrikethrough)}
        onClick={() =>
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
        }
        title="Strikethrough"
        type="button"
      >
        <Strikethrough className="size-4" />
      </button>
      <button
        aria-label="Format code"
        className={buttonClass(isCode)}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
        title="Code"
        type="button"
      >
        <Code className="size-4" />
      </button>
      <div className="mx-1 h-4 w-px bg-border" />
      <button
        aria-label="Insert link"
        className={buttonClass(isLink)}
        onClick={insertLink}
        title="Link"
        type="button"
      >
        <Link className="size-4" />
      </button>
    </div>
  );
}

function getSelectedNode(selection: ReturnType<typeof $getSelection>) {
  if (!$isRangeSelection(selection)) {
    return null;
  }
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  if (anchorNode === focusNode) {
    return anchorNode;
  }
  const isBackward = selection.isBackward();
  return isBackward ? anchorNode : focusNode;
}

interface FloatingToolbarPluginProps {
  anchorElem: HTMLElement;
}

export function FloatingToolbarPlugin({
  anchorElem,
}: FloatingToolbarPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [isText, setIsText] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isLink, setIsLink] = useState(false);

  const updateToolbar = useCallback(() => {
    editor.getEditorState().read(() => {
      if (editor.isComposing()) {
        return;
      }

      const selection = $getSelection();
      if (!$isRangeSelection(selection) || selection.isCollapsed()) {
        setIsText(false);
        return;
      }

      const node = getSelectedNode(selection);
      if (!node) {
        setIsText(false);
        return;
      }

      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));
      setIsCode(selection.hasFormat("code"));

      const parent = node.getParent();
      setIsLink($isLinkNode(parent) || $isLinkNode(node));

      const textContent = selection.getTextContent().replace(/\n/g, "");
      // Check textContent instead of node type to support multi-node selections
      setIsText(textContent !== "");
    });
  }, [editor]);

  useEffect(() => {
    // Scope selectionchange to this editor to avoid conflicts with multiple editors
    const handleSelectionChange = () => {
      const rootElement = editor.getRootElement();
      if (rootElement === null) {
        return;
      }
      const selection = window.getSelection();
      // Only update if selection is within this editor
      if (
        selection !== null &&
        selection.anchorNode !== null &&
        rootElement.contains(selection.anchorNode)
      ) {
        updateToolbar();
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [editor, updateToolbar]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(() => {
        updateToolbar();
      }),
      editor.registerRootListener(() => {
        if (editor.getRootElement() === null) {
          setIsText(false);
        }
      })
    );
  }, [editor, updateToolbar]);

  if (!isText) {
    return null;
  }

  return createPortal(
    <FloatingToolbar
      anchorElem={anchorElem}
      editor={editor}
      isBold={isBold}
      isCode={isCode}
      isItalic={isItalic}
      isLink={isLink}
      isStrikethrough={isStrikethrough}
      isUnderline={isUnderline}
    />,
    anchorElem
  );
}
