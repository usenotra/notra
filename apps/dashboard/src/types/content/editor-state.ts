import type { ContextItem, TextSelection } from "@notra/ai/types/chat";

import type { QueuedMessage } from "@/components/chat/chat-queue";
import type { EditorRefHandle } from "@/components/content/editor/plugins/editor-ref-plugin";

export interface ContentDocumentState {
  editedMarkdown: string | null;
  originalMarkdown: string;
  persistedTitle: string | null;
  editingTitle: string | null;
  persistedSlug: string | null;
  editingSlug: string | null;
  editorVersion: number;
  reviewPreviousMarkdown: string | null;
  writeFocusNonce: number;
}

export type ContentDocumentAction =
  | { type: "contentLoaded"; markdown: string }
  | { type: "remoteImageLoaded"; markdown: string }
  | { type: "markdownEdited"; markdown: string | null }
  | { type: "markdownNormalized"; markdown: string }
  | { type: "titleEdited"; title: string | null }
  | { type: "slugEdited"; slug: string | null }
  | { type: "serverTitleChanged"; title: string | null }
  | {
      type: "saveCompleted";
      markdown: string | null;
      title: string;
      slug: string | null;
      submittedTitle: string | null;
      submittedSlug: string | null;
    }
  | { type: "discarded" }
  | { type: "articleReady" }
  | { type: "reviewCleared" }
  | { type: "agentEditApplied"; markdown: string; previous: string | null }
  | { type: "markdownBaselineChanged"; markdown: string };

export interface ContentDocumentSource {
  contentType: string;
  markdown: string | null;
  slug: string | null;
  title: string | null;
}

export interface UseContentDocumentOptions {
  content: ContentDocumentSource | null | undefined;
  contentId: string;
  organizationId: string;
}

export interface ContentDocumentController extends ContentDocumentState {
  currentMarkdown: string;
  editorRef: React.RefObject<EditorRefHandle | null>;
  editedMarkdownRef: React.RefObject<string | null>;
  hasChanges: boolean;
  hasMarkdownChanges: boolean;
  hasSlugChanges: boolean;
  hasTitleChanges: boolean;
  isSaving: boolean;
  serverSlug: string | null;
  serverTitle: string;
  title: string;
  clearReview: () => void;
  applyAgentEdit: (markdown: string, previous: string | null) => void;
  discard: () => void;
  handleEditorChange: (markdown: string) => void;
  replacePersistedMarkdown: (markdown: string) => void;
  resetForArticle: () => void;
  save: () => Promise<boolean>;
  setEditedMarkdown: (markdown: string | null) => void;
  setEditingSlug: (slug: string | null) => void;
  setEditingTitle: (title: string | null) => void;
  setOriginalMarkdown: (markdown: string) => void;
}

export interface ContentChatUiState {
  selection: TextSelection | null;
  context: ContextItem[];
  input: string;
  queuedMessages: QueuedMessage[];
  activeChatId: string | null;
  chatIdToHydrate: string | null;
  error: string | null;
  isPanelOpen: boolean;
  hasOpenedPanel: boolean;
}

export type ContentChatUiAction =
  | { type: "selectionChanged"; selection: TextSelection | null }
  | { type: "contextAdded"; item: ContextItem }
  | { type: "contextRemoved"; item: ContextItem }
  | { type: "inputChanged"; input: string }
  | { type: "queueChanged"; messages: QueuedMessage[] }
  | { type: "queuedMessageEdited"; message: QueuedMessage }
  | { type: "chatInitialized"; chatId: string; hydrate: boolean }
  | { type: "chatSelected"; chatId: string }
  | { type: "newChatStarted"; chatId: string }
  | { type: "historyHydrated" }
  | { type: "errorChanged"; error: string | null }
  | { type: "panelOpened" }
  | { type: "panelClosed" }
  | { type: "panelToggled" };
