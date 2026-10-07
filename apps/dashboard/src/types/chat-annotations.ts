/** A passage the user selected in a previewed post, sent as agent context. */
export interface ChatAnnotation {
  id: string;
  postId: string;
  title: string;
  text: string;
  /** What should change in the passage; empty keeps it a plain reference. */
  note?: string;
}

/** A request to show an annotated passage in the preview. */
export interface ChatAnnotationFocus {
  postId: string;
  text: string;
  /** Changes on every request, so repeating the same one flashes again. */
  nonce: number;
}

/** One line box of a flashing passage, relative to the preview article. */
export interface ChatAnnotationFlashRect {
  key: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface ParsedChatAnnotations {
  annotations: Omit<ChatAnnotation, "id">[];
  /** The message text after the annotations block. */
  rest: string;
}
