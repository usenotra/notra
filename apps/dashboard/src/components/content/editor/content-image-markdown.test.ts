import { expect, test } from "bun:test";

import { HorizontalRuleNode } from "@lexical/extension";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { createEditor } from "lexical";

import { EDITOR_TRANSFORMERS } from "./markdown-transformers";
import { ContentImageNode } from "./nodes/content-image-node";
import { ContentVideoNode } from "./nodes/content-video-node";
import { KiboCodeBlockNode } from "./nodes/kibo-code-block-node";

function withMarkdown(markdown: string) {
  const editor = createEditor({
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      KiboCodeBlockNode,
      LinkNode,
      AutoLinkNode,
      HorizontalRuleNode,
      TableNode,
      TableRowNode,
      TableCellNode,
      ContentImageNode,
      ContentVideoNode,
    ],
    onError: (error: Error) => {
      throw error;
    },
  });
  editor.update(
    () => {
      $convertFromMarkdownString(markdown, EDITOR_TRANSFORMERS);
    },
    { discrete: true }
  );
  let next = "";
  editor.getEditorState().read(() => {
    next = $convertToMarkdownString(EDITOR_TRANSFORMERS);
  });
  return { editor, next };
}

test("image and video markdown round-trip through the editor", () => {
  expect(
    withMarkdown("![Cover photo](https://cdn.example/a.png)").next
  ).toContain("![Cover photo](https://cdn.example/a.png)");
  expect(
    withMarkdown('<video controls src="https://cdn.example/a.mp4"></video>')
      .next
  ).toContain('<video controls src="https://cdn.example/a.mp4"></video>');
});

test("unsafe media urls stay as text", () => {
  const unsafeUrl = ["java", "script:alert(1)"].join("");
  const image = withMarkdown(`![x](${unsafeUrl})`);
  const video = withMarkdown(`<video controls src="${unsafeUrl}"></video>`);
  const serialized = [
    JSON.stringify(image.editor.getEditorState().toJSON()),
    JSON.stringify(video.editor.getEditorState().toJSON()),
  ].join("");
  expect(serialized).not.toContain('"content-image"');
  expect(serialized).not.toContain('"content-video"');
  expect(serialized).toContain("alert(1)");
});
