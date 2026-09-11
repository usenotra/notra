"use client";

import Script from "next/script";
import { useEffect, useImperativeHandle, useRef, useState } from "react";

import {
  CONTACT_TURNSTILE_ACTION,
  TURNSTILE_SITE_KEY,
} from "@/constants/turnstile";
import type { ContactTurnstileProps } from "@/types/turnstile";

export function ContactTurnstile({ onToken, ref }: ContactTurnstileProps) {
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
    const api = window.turnstile;
    if (!(ready && container.current && api && TURNSTILE_SITE_KEY)) {
      return;
    }

    const id = api.render(container.current, {
      sitekey: TURNSTILE_SITE_KEY,
      action: CONTACT_TURNSTILE_ACTION,
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
  }, [ready, onToken]);

  return (
    <div className="flex flex-col gap-2">
      <Script
        onError={() => {
          onToken("");
          setFailed(true);
        }}
        onReady={() => setReady(true)}
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      />
      <div ref={container} />
      {failed || !TURNSTILE_SITE_KEY ? (
        <p className="text-destructive font-sans text-sm" role="alert">
          Verification could not load. Please reload the page, or email us at
          hello@usenotra.com.
        </p>
      ) : null}
    </div>
  );
}
