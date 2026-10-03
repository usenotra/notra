import {
  NAVBAR_SESSION_ENDPOINT,
  SESSION_PROBE_TIMEOUT_MS,
} from "@/constants/auth/session";

export function buildNavbarSessionScript() {
  return `window.__notraNavbarSession = fetch(${JSON.stringify(NAVBAR_SESSION_ENDPOINT)}, { credentials: "include", cache: "no-store", signal: AbortSignal.timeout(${SESSION_PROBE_TIMEOUT_MS}) }).then(response => response.ok ? response.json() : null).then(data => data?.isAuthenticated === true).catch(() => false);`;
}

export function getNavbarSession(): Promise<boolean> {
  window.__notraNavbarSession ??= fetch(NAVBAR_SESSION_ENDPOINT, {
    credentials: "include",
    cache: "no-store",
    signal: AbortSignal.timeout(SESSION_PROBE_TIMEOUT_MS),
  })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => data?.isAuthenticated === true)
    .catch(() => false);

  return window.__notraNavbarSession;
}
