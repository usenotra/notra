import type { Ref } from "react";

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      appearance: TurnstileAppearance;
      size: "flexible";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      "timeout-callback": () => void;
    }
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** "interaction-only" stays invisible unless Cloudflare needs a click. */
type TurnstileAppearance = "always" | "execute" | "interaction-only";

export interface TurnstileHandle {
  reset: () => void;
}

export interface TurnstileProps {
  /** Checked again on the server, so a token only works for its own form. */
  action: string;
  appearance?: TurnstileAppearance;
  failureMessage: string;
  onToken: (token: string) => void;
  ref?: Ref<TurnstileHandle>;
}
