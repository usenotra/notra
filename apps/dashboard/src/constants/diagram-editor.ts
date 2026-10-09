export const DIAGRAM_REVISION_HEADER = "x-diagram-revision";

// A full 150-element scene is well under 1 MB; anything bigger is not from the
// editor.
export const MAX_DIAGRAM_SCENE_BYTES = 2_000_000;

export const MAX_DIAGRAM_SCENE_ELEMENTS = 400;

// A slow or blocked font must not prevent editing indefinitely.
export const DIAGRAM_EDITOR_FONT_TIMEOUT_MS = 1500;
// Share of the editor the diagram fills when it opens.
export const DIAGRAM_EDITOR_VIEWPORT_ZOOM = 0.85;
