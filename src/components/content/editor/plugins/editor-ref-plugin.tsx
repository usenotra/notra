"use client";

import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
} from "lexical";
import {
  type MutableRefObject,
  type RefObject,
  useImperativeHandle,
} from "react";
import { EDITOR_TRANSFORMERS } from "../markdown-transformers";

export interface SelectionInfo {
  text: string;
  anchor: { offset: number };
  focus: { offset: number };
}

export interface EditorRefHandle {
  setMarkdown: (markdown: string) => void;
  getMarkdown: () => string;
  replaceSelection: (text: string) => void;
  insertAtCursor: (text: string) => void;
  getSelection: () => SelectionInfo | null;
  focus: () => void;
}

interface EditorRefPluginProps {
  editorRef: RefObject<EditorRefHandle | null>;
  isProgrammaticUpdateRef: MutableRefObject<boolean>;
}

export function EditorRefPlugin({
  editorRef,
  isProgrammaticUpdateRef,
}: EditorRefPluginProps) {
  const [editor] = useLexicalComposerContext();

  useImperativeHandle(
    editorRef,
    () => ({
      setMarkdown: (markdown: string) => {
        isProgrammaticUpdateRef.current = true;
        editor.update(
          () => {
            const root = $getRoot();
            root.clear();
            $convertFromMarkdownString(markdown, EDITOR_TRANSFORMERS);
          },
          {
            discrete: true,
            onUpdate: () => {
              setTimeout(() => {
                isProgrammaticUpdateRef.current = false;
              }, 0);
            },
          }
        );
      },

      getMarkdown: () => {
        let markdown = "";
        editor.getEditorState().read(() => {
          markdown = $convertToMarkdownString(EDITOR_TRANSFORMERS);
        });
        return markdown;
      },

      replaceSelection: (text: string) => {
        isProgrammaticUpdateRef.current = true;
        editor.update(
          () => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.insertText(text);
            }
          },
          {
            discrete: true,
            onUpdate: () => {
              setTimeout(() => {
                isProgrammaticUpdateRef.current = false;
              }, 0);
            },
          }
        );
      },

      insertAtCursor: (text: string) => {
        isProgrammaticUpdateRef.current = true;
        editor.update(
          () => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const textNode = $createTextNode(text);
              selection.insertNodes([textNode]);
            }
          },
          {
            discrete: true,
            onUpdate: () => {
              setTimeout(() => {
                isProgrammaticUpdateRef.current = false;
              }, 0);
            },
          }
        );
      },

      getSelection: () => {
        let selectionInfo: SelectionInfo | null = null;
        editor.getEditorState().read(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection) && !selection.isCollapsed()) {
            selectionInfo = {
              text: selection.getTextContent(),
              anchor: { offset: selection.anchor.offset },
              focus: { offset: selection.focus.offset },
            };
          }
        });
        return selectionInfo;
      },

      focus: () => {
        editor.focus();
      },
    }),
    [editor, isProgrammaticUpdateRef]
  );

  return null;
}
