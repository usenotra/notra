export function prependChatQuote(text: string, quote?: string | null): string {
  if (!quote) {
    return text;
  }
  return `${quote
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n")}\n\n${text}`;
}

export function getChatQuoteComposer(scopeId: string): HTMLElement | undefined {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-chat-quote-composer]")
  )
    .filter(
      (element) => element.getAttribute("data-chat-quote-composer") === scopeId
    )
    .flatMap((element) =>
      Array.from(
        element.querySelectorAll<HTMLElement>(
          "textarea:not(:disabled), [contenteditable='true']"
        )
      )
    )
    .find((element) => element.getClientRects().length > 0);
}
