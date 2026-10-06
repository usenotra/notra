export const INLINE_SAFE_HREF = /^(?:https?:\/\/|\/(?!\/)|mailto:|#)/i;
export const INLINE_CODE = /`([^`\n]+)`/g;
export const INLINE_LINK = /\[([^\]\n]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g;
export const INLINE_STRONG = /\*\*(.+?)\*\*|__(.+?)__/g;
export const INLINE_EMPHASIS = /\*(.+?)\*|(?<!\w)_(.+?)_(?!\w)/g;
export const INLINE_PLACEHOLDER = /\uE000(\d+)\uE000/g;
