"use client";

import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
} from "lexical";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/button";
import { cn } from "@/lib/utils";

import { $isKiboCodeBlockNode } from "./kibo-code-block-node";

const CODE_LANGUAGES: Record<string, string> = {
  plain: "Plain Text",
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

interface KiboCodeBlockComponentProps {
  code: string;
  language: string;
  nodeKey: string;
}

function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
  const isModifierKey = event.metaKey || event.ctrlKey;
  if (!isModifierKey) {
    event.stopPropagation();
  }
}

export default function KiboCodeBlockComponent({
  code,
  language,
  nodeKey,
}: KiboCodeBlockComponentProps) {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey);
  const [localCode, setLocalCode] = useState(code);
  const [prevCode, setPrevCode] = useState(code);
  const [isCopied, setIsCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lineIdPrefix = useId();

  const normalizedLanguage = language || "plain";
  const lineCount = Math.max(1, localCode.split("\n").length);

  if (code !== prevCode) {
    setPrevCode(code);
    setLocalCode(code);
  }

  // Auto-resize textarea when content changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: localCode triggers resize
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [localCode]);

  // Cleanup copy timeout
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onDelete = (event: KeyboardEvent) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        event.preventDefault();
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isKiboCodeBlockNode(node)) {
            node.remove();
          }
        });
        return true;
      }
      return false;
    };

    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          const target = event.target as HTMLElement;
          if (blockRef.current?.contains(target)) {
            if (!event.shiftKey) {
              clearSelection();
            }
            setSelected(true);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        onDelete,
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        onDelete,
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor, clearSelection, setSelected, isSelected, nodeKey]);

  const handleLanguageChange = (newLanguage: string | null) => {
    if (newLanguage === null) {
      return;
    }
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isKiboCodeBlockNode(node)) {
        node.setLanguage(newLanguage === "plain" ? "" : newLanguage);
      }
    });
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setLocalCode(newCode);
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isKiboCodeBlockNode(node)) {
        node.setCode(newCode);
      }
    });
  };

  const handleCopy = () => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      return;
    }
    navigator.clipboard.writeText(localCode).catch(() => {
      // Ignore clipboard errors
    });
    setIsCopied(true);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = setTimeout(() => {
      setIsCopied(false);
      copyTimeoutRef.current = null;
    }, 2000);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Interactive editor element
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Interactive editor element
    // biome-ignore lint/a11y/useKeyWithClickEvents: Click focuses textarea
    <div
      className={cn(
        "bg-secondary/50 relative my-4 overflow-hidden rounded-lg border",
        isSelected && "ring-primary ring-2 ring-offset-2"
      )}
      onClick={() => textareaRef.current?.focus()}
      ref={blockRef}
    >
      <div className="bg-secondary flex items-center justify-between border-b px-1 py-1">
        <Select onValueChange={handleLanguageChange} value={normalizedLanguage}>
          <SelectTrigger
            aria-label="Select code language"
            className="text-muted-foreground h-7 w-fit gap-1 border-none bg-transparent text-xs shadow-none"
            size="sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CODE_LANGUAGES).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          aria-label={isCopied ? "Code copied" : "Copy code"}
          className="h-7 shrink-0"
          onClick={handleCopy}
          size="icon"
          variant="ghost"
        >
          <HugeiconsIcon
            className={isCopied ? "text-success" : "text-muted-foreground"}
            icon={isCopied ? Tick02Icon : Copy01Icon}
            size={14}
          />
        </Button>
      </div>
      <div className="flex">
        <div
          className="bg-secondary/50 text-muted-foreground/50 min-w-[3ch] border-r py-4 pr-2 pl-4 text-right font-mono text-sm leading-relaxed tabular-nums select-none"
          ref={lineNumbersRef}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={`${lineIdPrefix}-${i + 1}`}>{i + 1}</div>
          ))}
        </div>
        <textarea
          className="block flex-1 resize-none bg-transparent py-4 pr-4 pl-3 font-mono text-sm leading-relaxed outline-none"
          onChange={handleCodeChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter code here..."
          ref={textareaRef}
          rows={1}
          spellCheck={false}
          value={localCode}
        />
      </div>
    </div>
  );
}
