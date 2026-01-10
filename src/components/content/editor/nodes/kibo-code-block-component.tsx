"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
} from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type BundledLanguage,
  CodeBlock,
  CodeBlockBody,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockItem,
} from "@/components/kibo-ui/code-block";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function KiboCodeBlockComponent({
  code,
  language,
  nodeKey,
}: KiboCodeBlockComponentProps) {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState(code);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);

  const normalizedLanguage = language || "plain";

  const onDelete = useCallback(
    (event: KeyboardEvent) => {
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
    },
    [editor, isSelected, nodeKey]
  );

  const onEnter = useCallback(
    (event: KeyboardEvent) => {
      if (isSelected && !isEditing) {
        event.preventDefault();
        setIsEditing(true);
        setEditedCode(code);
        return true;
      }
      return false;
    },
    [isSelected, isEditing, code]
  );

  const onEscape = useCallback(
    (event: KeyboardEvent) => {
      if (isEditing) {
        event.preventDefault();
        setIsEditing(false);
        setEditedCode(code);
        return true;
      }
      return false;
    },
    [isEditing, code]
  );

  useEffect(() => {
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
      ),
      editor.registerCommand(KEY_ENTER_COMMAND, onEnter, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_ESCAPE_COMMAND, onEscape, COMMAND_PRIORITY_LOW)
    );
  }, [editor, clearSelection, setSelected, onDelete, onEnter, onEscape]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditedCode(code);
  }, [code]);

  const handleLanguageChange = useCallback(
    (newLanguage: string | null) => {
      if (newLanguage === null) {
        return;
      }
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isKiboCodeBlockNode(node)) {
          node.setLanguage(newLanguage === "plain" ? "" : newLanguage);
        }
      });
    },
    [editor, nodeKey]
  );

  const handleSaveEdit = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isKiboCodeBlockNode(node)) {
        node.setCode(editedCode);
      }
    });
    setIsEditing(false);
  }, [editor, nodeKey, editedCode]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditedCode(code);
  }, [code]);

  const handleTextareaKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsEditing(false);
        setEditedCode(code);
      } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleSaveEdit();
      }
      event.stopPropagation();
    },
    [code, handleSaveEdit]
  );

  const data = [
    {
      language: normalizedLanguage,
      filename: `code.${normalizedLanguage}`,
      code: isEditing ? editedCode : code,
    },
  ];

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Interactive editor element
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Interactive editor element
    <div
      className={cn(
        "relative",
        isSelected && "rounded-lg ring-2 ring-primary ring-offset-2"
      )}
      onDoubleClick={handleDoubleClick}
      ref={blockRef}
    >
      <CodeBlock
        data={data}
        defaultValue={normalizedLanguage}
        value={normalizedLanguage}
      >
        <CodeBlockHeader>
          <Select
            onValueChange={handleLanguageChange}
            value={normalizedLanguage}
          >
            <SelectTrigger
              aria-label="Select code language"
              className="h-7 w-fit gap-1 border-none bg-transparent text-muted-foreground text-xs shadow-none"
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
          <div className="ml-auto flex items-center gap-1">
            {isEditing && (
              <Button
                className="h-7 text-xs"
                onClick={handleSaveEdit}
                size="sm"
                variant="ghost"
              >
                Save (⌘↵)
              </Button>
            )}
            <CodeBlockCopyButton />
          </div>
        </CodeBlockHeader>
        <CodeBlockBody>
          {(item) =>
            isEditing ? (
              <div className="relative" key={item.language}>
                <textarea
                  className="min-h-[100px] w-full resize-none bg-transparent p-4 font-mono text-sm outline-none"
                  onChange={(e) => setEditedCode(e.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  ref={textareaRef}
                  spellCheck={false}
                  value={editedCode}
                />
              </div>
            ) : (
              <CodeBlockItem
                key={item.language}
                lineNumbers
                value={normalizedLanguage}
              >
                <CodeBlockContent
                  language={normalizedLanguage as BundledLanguage}
                >
                  {code || " "}
                </CodeBlockContent>
              </CodeBlockItem>
            )
          }
        </CodeBlockBody>
      </CodeBlock>
      {!(code || isEditing) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-muted-foreground text-sm">
            Double-click or press Enter to edit
          </span>
        </div>
      )}
    </div>
  );
}
