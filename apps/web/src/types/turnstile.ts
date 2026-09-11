import type { Ref } from "react";

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
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

export interface ContactTurnstileHandle {
  reset: () => void;
}

export interface ContactTurnstileProps {
  onToken: (token: string) => void;
  ref: Ref<ContactTurnstileHandle>;
}
