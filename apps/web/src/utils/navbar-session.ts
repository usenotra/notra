import {
  NAVBAR_SESSION_ENDPOINT,
  SESSION_PROBE_TIMEOUT_MS,
} from "@/constants/auth/session";

export function buildNavbarSessionScript() {
  return `window.__notraNavbarSession ??= (() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), ${SESSION_PROBE_TIMEOUT_MS});
    return fetch(${JSON.stringify(NAVBAR_SESSION_ENDPOINT)}, { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("Navbar session probe failed"); return response.json(); })
      .then(data => data?.isAuthenticated === true)
      .catch(() => { window.__notraNavbarSession = undefined; return false; })
      .finally(() => window.clearTimeout(timeout));
  })();`;
}

export function getNavbarSession(): Promise<boolean> {
  if (window.__notraNavbarSession) {
    return window.__notraNavbarSession;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    SESSION_PROBE_TIMEOUT_MS
  );

  window.__notraNavbarSession = fetch(NAVBAR_SESSION_ENDPOINT, {
    credentials: "include",
    cache: "no-store",
    signal: controller.signal,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Navbar session probe failed");
      }
      return response.json();
    })
    .then((data) => data?.isAuthenticated === true)
    .catch(() => {
      window.__notraNavbarSession = undefined;
      return false;
    })
    .finally(() => window.clearTimeout(timeout));

  return window.__notraNavbarSession;
}
