import { TURNSTILE_SCRIPT_SRC } from "@/constants/turnstile";

let turnstileScript: Promise<void> | null = null;

export function loadTurnstileScript() {
  if (window.turnstile) {
    return Promise.resolve();
  }

  turnstileScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => {
      turnstileScript = null;
      script.remove();
      reject(new Error("Failed to load Turnstile"));
    });
    document.head.append(script);
  });

  return turnstileScript;
}
