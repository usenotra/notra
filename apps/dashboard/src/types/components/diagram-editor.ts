import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

export interface DiagramEditorScene {
  elements: Record<string, unknown>[];
  appState?: { viewBackgroundColor?: string };
}

export interface DiagramEditorLoadedScene {
  scene: DiagramEditorScene;
  /** Stored revision the scene belongs to; sent back on save. */
  revision: number;
}

export type DiagramEditorSaveResult =
  | { status: "saved"; droppedTypes: string[] }
  | { status: "conflict" }
  | { status: "invalid"; reason: string };

export interface DiagramEditorCanvasProps {
  scene: DiagramEditorScene;
  onReady: (api: ExcalidrawImperativeAPI) => void;
}

export interface DiagramEditorDialogProps {
  organizationId: string;
  contentId: string;
  onSaved: () => Promise<unknown> | void;
}
