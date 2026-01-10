"use client";

import { $isCodeNode, type CodeNode } from "@lexical/code";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { Check, ChevronDown, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const CODE_LANGUAGES: Record<string, string> = {
  "": "Plain Text",
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  go: "Go",
  rust: "Rust",
  ruby: "Ruby",
  php: "PHP",
  swift: "Swift",
  kotlin: "Kotlin",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  json: "JSON",
  yaml: "YAML",
  xml: "XML",
  markdown: "Markdown",
  bash: "Bash",
  shell: "Shell",
};

interface CodeBlockToolbarProps {
  editor: ReturnType<typeof useLexicalComposerContext>[0];
  nodeKey: string;
  language: string;
  anchorElem: HTMLElement;
  codeElement: HTMLElement;
}

function CodeBlockToolbar({
  editor,
  nodeKey,
  language,
  anchorElem,
  codeElement,
}: CodeBlockToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const updatePosition = useCallback(() => {
    const toolbar = toolbarRef.current;
    if (!(toolbar && codeElement)) {
      return;
    }

    const codeRect = codeElement.getBoundingClientRect();
    const anchorRect = anchorElem.getBoundingClientRect();

    toolbar.style.top = `${codeRect.top - anchorRect.top - 8}px`;
    toolbar.style.right = `${anchorRect.right - codeRect.right + 8}px`;
  }, [anchorElem, codeElement]);

  useEffect(() => {
    updatePosition();
    window.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [updatePosition]);

  const handleLanguageChange = useCallback(
    (newLanguage: string) => {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isCodeNode(node)) {
          node.setLanguage(newLanguage);
        }
      });
      setShowDropdown(false);
    },
    [editor, nodeKey]
  );

  const handleCopy = useCallback(() => {
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isCodeNode(node)) {
        const text = node.getTextContent();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  }, [editor, nodeKey]);

  return createPortal(
    <div
      className="absolute z-50 flex items-center gap-1"
      ref={toolbarRef}
      style={{ pointerEvents: "auto" }}
    >
      <div className="relative">
        <button
          className="flex h-7 items-center gap-1 rounded border bg-popover px-2 text-muted-foreground text-xs hover:bg-muted"
          onClick={() => setShowDropdown(!showDropdown)}
          type="button"
        >
          <span>{CODE_LANGUAGES[language] || "Plain Text"}</span>
          <ChevronDown className="size-3" />
        </button>
        {showDropdown && (
          <div className="absolute top-full right-0 z-50 mt-1 max-h-60 w-40 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
            {Object.entries(CODE_LANGUAGES).map(([key, label]) => (
              <button
                className={`w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted ${
                  key === language ? "bg-muted font-medium" : ""
                }`}
                key={key}
                onClick={() => handleLanguageChange(key)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        className="flex h-7 items-center rounded border bg-popover px-2 text-muted-foreground text-xs hover:bg-muted"
        onClick={handleCopy}
        title="Copy code"
        type="button"
      >
        {copied ? (
          <Check className="size-3 text-green-500" />
        ) : (
          <Copy className="size-3" />
        )}
      </button>
    </div>,
    anchorElem
  );
}

interface ActiveCodeBlock {
  nodeKey: string;
  language: string;
  element: HTMLElement;
}

function findCodeNodeFromRangeSelection(
  selection: ReturnType<typeof $getSelection>,
  editor: ReturnType<typeof useLexicalComposerContext>[0]
): ActiveCodeBlock | null {
  if (!$isRangeSelection(selection)) {
    return null;
  }

  const anchorNode = selection.anchor.getNode();
  const parent = anchorNode.getParent();

  let codeNode: CodeNode | null = null;
  if ($isCodeNode(parent)) {
    codeNode = parent;
  } else if (parent) {
    const grandparent = parent.getParent();
    if ($isCodeNode(grandparent)) {
      codeNode = grandparent;
    }
  }

  if (!codeNode) {
    return null;
  }

  const nodeKey = codeNode.getKey();
  const language = codeNode.getLanguage() || "";
  const element = editor.getElementByKey(nodeKey);

  if (!element) {
    return null;
  }

  return { nodeKey, language, element };
}

function findCodeNodeFromNodeSelection(
  selection: ReturnType<typeof $getSelection>,
  editor: ReturnType<typeof useLexicalComposerContext>[0]
): ActiveCodeBlock | null {
  if (!$isNodeSelection(selection)) {
    return null;
  }

  const nodes = selection.getNodes();
  if (nodes.length !== 1 || !$isCodeNode(nodes[0])) {
    return null;
  }

  const codeNode = nodes[0];
  const nodeKey = codeNode.getKey();
  const language = codeNode.getLanguage() || "";
  const element = editor.getElementByKey(nodeKey);

  if (!element) {
    return null;
  }

  return { nodeKey, language, element };
}

interface CodeBlockPluginProps {
  anchorElem: HTMLElement;
}

export function CodeBlockPlugin({ anchorElem }: CodeBlockPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [activeCodeBlock, setActiveCodeBlock] =
    useState<ActiveCodeBlock | null>(null);

  const updateActiveCodeBlock = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();

      const fromRange = findCodeNodeFromRangeSelection(selection, editor);
      if (fromRange) {
        setActiveCodeBlock(fromRange);
        return;
      }

      const fromNode = findCodeNodeFromNodeSelection(selection, editor);
      if (fromNode) {
        setActiveCodeBlock(fromNode);
        return;
      }

      setActiveCodeBlock(null);
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateActiveCodeBlock();
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, updateActiveCodeBlock]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateActiveCodeBlock();
      });
    });
  }, [editor, updateActiveCodeBlock]);

  if (!activeCodeBlock) {
    return null;
  }

  return (
    <CodeBlockToolbar
      anchorElem={anchorElem}
      codeElement={activeCodeBlock.element}
      editor={editor}
      language={activeCodeBlock.language}
      nodeKey={activeCodeBlock.nodeKey}
    />
  );
}
