import type { ContextItem } from "@notra/ai/types/chat";

import type {
  ContentChatUiAction,
  ContentChatUiState,
  ContentDocumentAction,
  ContentDocumentState,
} from "@/types/content/editor-state";

export function contentDocumentReducer(
  state: ContentDocumentState,
  action: ContentDocumentAction
): ContentDocumentState {
  switch (action.type) {
    case "contentLoaded":
    case "remoteImageLoaded":
      return {
        ...state,
        editedMarkdown: action.markdown,
        originalMarkdown: action.markdown,
        editorVersion: state.editorVersion + 1,
      };
    case "markdownEdited":
      return { ...state, editedMarkdown: action.markdown };
    case "markdownNormalized":
      return {
        ...state,
        editedMarkdown: action.markdown,
        originalMarkdown: action.markdown,
      };
    case "titleEdited":
      return { ...state, editingTitle: action.title };
    case "slugEdited":
      return { ...state, editingSlug: action.slug };
    case "serverTitleChanged":
      return { ...state, persistedTitle: action.title };
    case "saveCompleted":
      return {
        ...state,
        originalMarkdown: action.markdown ?? state.originalMarkdown,
        persistedTitle: action.title,
        editingTitle:
          state.editingTitle === action.submittedTitle
            ? null
            : state.editingTitle,
        persistedSlug: action.slug,
        editingSlug:
          state.editingSlug === action.submittedSlug ? null : state.editingSlug,
        reviewPreviousMarkdown: null,
        editorVersion:
          state.reviewPreviousMarkdown === null
            ? state.editorVersion
            : state.editorVersion + 1,
      };
    case "discarded":
      return {
        ...state,
        editedMarkdown: state.originalMarkdown,
        editingTitle: null,
        editingSlug: null,
        reviewPreviousMarkdown: null,
        editorVersion: state.editorVersion + 1,
      };
    case "articleReady":
      return {
        ...state,
        editedMarkdown: null,
        persistedSlug: null,
        editingTitle: null,
        editingSlug: null,
        reviewPreviousMarkdown: null,
      };
    case "reviewCleared":
      return { ...state, reviewPreviousMarkdown: null };
    case "agentEditApplied":
      return {
        ...state,
        editedMarkdown: action.markdown,
        reviewPreviousMarkdown: action.previous,
        writeFocusNonce: state.writeFocusNonce + 1,
        editorVersion: state.editorVersion + 1,
      };
    case "markdownBaselineChanged":
      return {
        ...state,
        originalMarkdown: action.markdown,
      };
    default:
      return state;
  }
}

function isSameContextItem(left: ContextItem, right: ContextItem): boolean {
  if (left.type !== right.type) {
    return false;
  }
  if (left.type === "github-repo" && right.type === "github-repo") {
    return left.owner === right.owner && left.repo === right.repo;
  }
  return left.integrationId === right.integrationId;
}

export function contentChatUiReducer(
  state: ContentChatUiState,
  action: ContentChatUiAction
): ContentChatUiState {
  switch (action.type) {
    case "selectionChanged":
      return { ...state, selection: action.selection };
    case "contextAdded":
      return state.context.some((item) => isSameContextItem(item, action.item))
        ? state
        : { ...state, context: [...state.context, action.item] };
    case "contextRemoved":
      return {
        ...state,
        context: state.context.filter(
          (item) => !isSameContextItem(item, action.item)
        ),
      };
    case "inputChanged":
      return { ...state, input: action.input };
    case "queueChanged":
      return { ...state, queuedMessages: action.messages };
    case "queuedMessageEdited":
      return {
        ...state,
        queuedMessages: state.queuedMessages.filter(
          (message) => message.id !== action.message.id
        ),
        input: action.message.text,
        selection: action.message.selection ?? state.selection,
        context: action.message.context?.length
          ? action.message.context
          : state.context,
      };
    case "chatInitialized":
      return {
        ...state,
        activeChatId: action.chatId,
        chatIdToHydrate: action.hydrate ? action.chatId : null,
      };
    case "chatSelected":
      return {
        ...state,
        queuedMessages: [],
        activeChatId: action.chatId,
        chatIdToHydrate: action.chatId,
      };
    case "newChatStarted":
      return {
        ...state,
        queuedMessages: [],
        input: "",
        activeChatId: action.chatId,
        chatIdToHydrate: null,
      };
    case "historyHydrated":
      return { ...state, chatIdToHydrate: null };
    case "errorChanged":
      return { ...state, error: action.error };
    case "panelOpened":
      return { ...state, isPanelOpen: true, hasOpenedPanel: true };
    case "panelClosed":
      return { ...state, isPanelOpen: false };
    case "panelToggled": {
      const isPanelOpen = !state.isPanelOpen;
      return {
        ...state,
        isPanelOpen,
        hasOpenedPanel: state.hasOpenedPanel || isPanelOpen,
      };
    }
    default:
      return state;
  }
}
