export const ANALYTICS_EVENT_MAX_BYTES = 1024;

export const ANALYTICS_SCRIPT_CACHE_CONTROL = "public, max-age=3600";

/**
 * Measures how long the page stays visible and how far it was scrolled, then
 * reports the running total with sendBeacon whenever the tab hides. One view
 * can report several times; the dashboard reads the largest total per view.
 * Framed pages (the dashboard preview) are not measured.
 */
export const ANALYTICS_SCRIPT = `(() => {
  const script = document.currentScript;
  const endpoint = script && script.dataset.endpoint;
  if (!endpoint || window.top !== window || !navigator.sendBeacon) return;
  const id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
  let total = 0;
  let depth = 0;
  let reported = 0;
  let shownAt = document.visibilityState === "visible" ? performance.now() : null;
  const measureScroll = () => {
    const root = document.documentElement;
    const room = root.scrollHeight - window.innerHeight;
    const reached = room > 0 ? Math.round(Math.min(1, window.scrollY / room) * 100) : 100;
    if (reached > depth) depth = reached;
  };
  const report = () => {
    if (shownAt !== null) {
      total += performance.now() - shownAt;
      shownAt = null;
    }
    if (total - reported < 1) return;
    reported = total;
    navigator.sendBeacon(
      endpoint,
      JSON.stringify({ v: id, p: location.pathname, ms: Math.round(total), sd: depth })
    );
  };
  measureScroll();
  addEventListener("scroll", measureScroll, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") report();
    else if (shownAt === null) shownAt = performance.now();
  });
  addEventListener("pagehide", report);
})();
`;
