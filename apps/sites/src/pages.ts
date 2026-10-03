const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title><style>:root{color-scheme:light dark}body{margin:0;min-height:100dvh;display:grid;place-items:center;font:16px/1.6 ui-sans-serif,system-ui,sans-serif;background:light-dark(#fafaf9,#0d0d0f);color:light-dark(#18181b,#f2f2f3)}main{max-width:28rem;padding:2rem;text-align:center}h1{font-size:1.4rem;margin:0 0 .5rem;letter-spacing:-.01em}p{margin:0 0 1.25rem;color:light-dark(#5f5f66,#a0a0a8)}a{display:inline-block;padding:.55rem 1rem;border-radius:999px;background:light-dark(#18181b,#f2f2f3);color:light-dark(#fff,#18181b);text-decoration:none;font-weight:500}</style></head><body><main>${body}</main></body></html>`;
}

export function notFoundPage(): string {
  return page(
    "Not found",
    "<h1>Page not found</h1><p>There is nothing at this address.</p>"
  );
}

export function notDeployedPage(): string {
  return page(
    "Not published yet",
    "<h1>Nothing published yet</h1><p>This site exists, but its first deployment has not finished.</p>"
  );
}

export function unavailablePage(): string {
  return page(
    "Unavailable",
    "<h1>This site is unavailable</h1><p>It has been taken offline.</p>"
  );
}

export function previewLockedPage(signInUrl: string): string {
  return page(
    "Protected preview",
    `<h1>This preview is private</h1><p>Sign in with an account that has access to this site, or ask for a share link.</p><a href="${escapeHtml(signInUrl)}">Continue with Notra</a>`
  );
}

export function serviceErrorPage(): string {
  return page(
    "Temporarily unavailable",
    "<h1>Temporarily unavailable</h1><p>Please try again in a moment.</p>"
  );
}
