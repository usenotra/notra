import { useEffect, useImperativeHandle, useRef, useState } from "react";

import { TURNSTILE_SITE_KEY } from "@/constants/turnstile";
import { loadTurnstileScript } from "@/lib/turnstile/load-script";
import type { TurnstileProps } from "@/types/turnstile";

export function Turnstile({
  action,
  appearance = "always",
  failureMessage,
  onToken,
  ref,
}: TurnstileProps) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        onToken("");
        if (widgetId.current !== null) {
          window.turnstile?.reset(widgetId.current);
        }
      },
    }),
    [onToken]
  );

  useEffect(() => {
    let active = true;
    loadTurnstileScript()
      .then(() => {
        if (active) {
          setReady(true);
        }
      })
      .catch(() => {
        if (active) {
          onToken("");
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [onToken]);

  useEffect(() => {
    const api = window.turnstile;
    if (!(ready && container.current && api && TURNSTILE_SITE_KEY)) {
      return;
    }

    const id = api.render(container.current, {
      sitekey: TURNSTILE_SITE_KEY,
      action,
      appearance,
      size: "flexible",
      callback: (token) => {
        setFailed(false);
        onToken(token);
      },
      "expired-callback": () => onToken(""),
      "timeout-callback": () => onToken(""),
      "error-callback": () => {
        onToken("");
        setFailed(true);
      },
    });
    widgetId.current = id;

    return () => {
      api.remove(id);
      widgetId.current = null;
    };
  }, [ready, onToken, action, appearance]);

  return (
    <div className="flex flex-col gap-2">
      <div ref={container} />
      {failed || (!TURNSTILE_SITE_KEY && import.meta.env.PROD) ? (
        <p className="text-destructive font-sans text-sm" role="alert">
          {failureMessage}
        </p>
      ) : null}
    </div>
  );
}
