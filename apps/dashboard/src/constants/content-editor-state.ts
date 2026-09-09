import type {
  ContentChatUiState,
  ContentDocumentState,
} from "@/types/content/editor-state";

export const INITIAL_CONTENT_DOCUMENT_STATE: ContentDocumentState = {
  editedMarkdown: null,
  originalMarkdown: "",
  persistedTitle: null,
  editingTitle: null,
  persistedSlug: null,
  editingSlug: null,
  editorVersion: 0,
  reviewPreviousMarkdown: null,
  writeFocusNonce: 0,
};

export const INITIAL_CONTENT_CHAT_UI_STATE: ContentChatUiState = {
  selection: null,
  context: [],
  input: "",
  queuedMessages: [],
  activeChatId: null,
  chatIdToHydrate: null,
  error: null,
  isPanelOpen: false,
  hasOpenedPanel: false,
};
