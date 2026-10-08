import { Editor } from "@pierre/diffs/edit";
import type { EditorFactory } from "@pierre/diffs/edit";

export const createSiteEditor: EditorFactory<unknown, undefined> = (
  editorType,
  options,
  editStateKey
) => new Editor(editorType, options, editStateKey);
