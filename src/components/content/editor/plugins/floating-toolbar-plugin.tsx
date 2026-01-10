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
  isLinkEditMode: boolean;
  setIsLinkEditMode: (value: boolean) => void;
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
  isLinkEditMode,
  setIsLinkEditMode,
}: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [linkUrl, setLinkUrl] = useState("https://");

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

    // Calculate position above selection
    const spaceAbove = rect.top - anchorRect.top;
    const toolbarHeight = toolbar.offsetHeight;
    const minSpaceNeeded = toolbarHeight + 16;

    let top: number;
    if (spaceAbove < minSpaceNeeded) {
      // Not enough space above, position below selection
      top = rect.bottom - anchorRect.top + 8;
    } else {
      // Position above selection
      top = rect.top - anchorRect.top - toolbarHeight - 8;
    }

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

  // Focus input when entering link edit mode
  useEffect(() => {
    if (isLinkEditMode) {
      setLinkUrl("https://");
      const timeoutId = setTimeout(() => linkInputRef.current?.focus(), 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isLinkEditMode]);

  const handleLinkClick = useCallback(() => {
    if (isLink) {
      // Remove the link
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
      setIsLinkEditMode(false);
    } else {
      // Create link with placeholder URL first, then enter edit mode
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, "https://");
      setIsLinkEditMode(true);
    }
  }, [editor, isLink, setIsLinkEditMode]);

  const submitLink = useCallback(() => {
    const trimmedUrl = linkUrl.trim();
    if (trimmedUrl !== "" && trimmedUrl !== "https://") {
      // Validate URL format
      let isValidUrl = false;
      try {
        new URL(trimmedUrl);
        isValidUrl = true;
      } catch {
        // Check if it's a relative URL
        isValidUrl = trimmedUrl.startsWith("/") || trimmedUrl.startsWith("./");
      }

      if (isValidUrl) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, trimmedUrl);
      } else {
        // Invalid URL format, remove the link
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
      }
    } else {
      // Remove the link if URL is empty
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
    setIsLinkEditMode(false);
    setLinkUrl("https://");
  }, [editor, linkUrl, setIsLinkEditMode]);

  const cancelLinkEdit = useCallback(() => {
    // Remove the placeholder link if canceling
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    setIsLinkEditMode(false);
    setLinkUrl("https://");
  }, [editor, setIsLinkEditMode]);

  const handleLinkKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitLink();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelLinkEdit();
      }
    },
    [submitLink, cancelLinkEdit]
  );

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
        className={buttonClass(isLink || isLinkEditMode)}
        onClick={handleLinkClick}
        title="Link"
        type="button"
      >
        <Link className="size-4" />
      </button>
      {isLinkEditMode && (
        <div className="ml-1 flex items-center gap-1">
          <input
            aria-label="URL"
            className="h-7 w-40 rounded border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={handleLinkKeyDown}
            placeholder="Enter URL"
            ref={linkInputRef}
            type="url"
            value={linkUrl}
          />
          <button
            aria-label="Apply link"
            className="rounded bg-primary px-2 py-1 text-primary-foreground text-xs hover:bg-primary/90"
            onClick={submitLink}
            type="button"
          >
            Apply
          </button>
        </div>
      )}
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
  const [isLinkEditMode, setIsLinkEditMode] = useState(false);

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
      setIsText(textContent !== "");
    });
  }, [editor]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const rootElement = editor.getRootElement();
      if (rootElement === null) {
        return;
      }
      const selection = window.getSelection();
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

  // Keep toolbar visible while in link edit mode even if selection changes
  if (!(isText || isLinkEditMode)) {
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
      isLinkEditMode={isLinkEditMode}
      isStrikethrough={isStrikethrough}
      isUnderline={isUnderline}
      setIsLinkEditMode={setIsLinkEditMode}
    />,
    anchorElem
  );
}
