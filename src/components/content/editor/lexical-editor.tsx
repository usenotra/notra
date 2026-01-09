"use client";

import { CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { $convertFromMarkdownString } from "@lexical/markdown";
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { type RefObject, useCallback, useMemo, useRef } from "react";
import { editorTheme } from "./editor-theme";
import { EDITOR_TRANSFORMERS } from "./markdown-transformers";
import { EditorAutoLinkPlugin } from "./plugins/auto-link-plugin";
import {
  type EditorRefHandle,
  EditorRefPlugin,
} from "./plugins/editor-ref-plugin";
import { HorizontalRulePlugin } from "./plugins/horizontal-rule-plugin";
import { MarkdownSyncPlugin } from "./plugins/markdown-sync-plugin";
import { SelectionPlugin } from "./plugins/selection-plugin";
import { TabFocusPlugin } from "./plugins/tab-focus-plugin";

interface LexicalEditorProps {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
  onSelectionChange: (selectedText: string | null) => void;
  editable?: boolean;
  editorRef?: RefObject<EditorRefHandle | null>;
}

export function LexicalEditor({
  initialMarkdown,
  onChange,
  onSelectionChange,
  editable = true,
  editorRef,
}: LexicalEditorProps) {
  const isProgrammaticUpdateRef = useRef(false);

  const onError = useCallback((error: Error) => {
    console.error("Lexical error:", error);
  }, []);

  const initialConfig = useMemo(
    () => ({
      namespace: "ContentEditor",
      nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        CodeNode,
        LinkNode,
        AutoLinkNode,
        HorizontalRuleNode,
      ],
      theme: editorTheme,
      editable,
      onError,
      editorState: () => {
        $convertFromMarkdownString(initialMarkdown, EDITOR_TRANSFORMERS);
      },
    }),
    [initialMarkdown, editable, onError]
  );

  const handleChange = useCallback(
    (markdown: string) => {
      if (!isProgrammaticUpdateRef.current) {
        onChange(markdown);
      }
    },
    [onChange]
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="lexical-editor relative">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className={`min-h-[500px] outline-none ${
                editable ? "" : "cursor-default"
              }`}
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <HorizontalRulePlugin />
        {editable && (
          <MarkdownShortcutPlugin transformers={EDITOR_TRANSFORMERS} />
        )}
        {editable && <EditorAutoLinkPlugin />}
        <ClickableLinkPlugin newTab />
        <TabFocusPlugin />
        <MarkdownSyncPlugin
          onChange={handleChange}
          transformers={EDITOR_TRANSFORMERS}
        />
        <SelectionPlugin onSelectionChange={onSelectionChange} />
        {editorRef && (
          <EditorRefPlugin
            editorRef={editorRef}
            isProgrammaticUpdateRef={isProgrammaticUpdateRef}
          />
        )}
      </div>
    </LexicalComposer>
  );
}
