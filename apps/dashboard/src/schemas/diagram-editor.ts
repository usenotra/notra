import { z } from "zod";

import { MAX_DIAGRAM_SCENE_ELEMENTS } from "@/constants/diagram-editor";

// The server converts the scene back into a validated spec, so this only
// bounds the payload; element shapes are checked by sceneToDiagramSpec.
export const saveDiagramSceneSchema = z.object({
  scene: z.object({
    elements: z
      .array(z.record(z.string(), z.unknown()))
      .min(1)
      .max(MAX_DIAGRAM_SCENE_ELEMENTS),
    appState: z
      .object({ viewBackgroundColor: z.string().max(40).optional() })
      .optional(),
  }),
  // Revision the editor loaded; see DIAGRAM_REVISION_HEADER.
  revision: z.number().int().min(0),
});
