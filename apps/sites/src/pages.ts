import { SITE_PREVIEW_AUTH_PATH } from "@notra/sites-core/constants/sites";

import {
  GATE_ERROR_MESSAGES,
  GLOBE_ICON_SVG,
  LOCK_ICON_SVG,
  NOTRA_HOME_URL,
  NOTRA_MARK_CHIP_SVG,
  NOTRA_MARK_SVG,
  SECURITY_TXT_LIFETIME_DAYS,
  SITES_ABUSE_EMAIL,
  SITES_SECURITY_EMAIL,
  SYSTEM_PAGE_CSS,
} from "./constants/pages";
import type {
  PreviewGateError,
  PreviewGatePage,
  SystemPageContent,
} from "./types/pages";
import { escapeHtml } from "./utils/html";

function page({ title, body }: SystemPageContent): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="referrer" content="same-origin"><title>${escapeHtml(title)}</title><style>${SYSTEM_PAGE_CSS}</style></head><body><header><a class="brand" href="${NOTRA_HOME_URL}" aria-label="Notra">${NOTRA_MARK_SVG}<span>Notra</span></a></header><main><div class="panel">${body}</div></main></body></html>`;
}

function statusPage(code: string, heading: string, text: string): string {
  return page({
    title: heading,
    body: `<p class="code">${code}</p><h1>${heading}</h1><p>${text}</p>`,
  });
}

export function notFoundPage(): string {
  return statusPage(
    "404",
    "Page not found",
    "There is nothing at this address."
  );
}

export function notDeployedPage(): string {
  return statusPage(
    "404",
    "Nothing published yet",
    "This site exists, but its first deployment hasn't finished."
  );
}

export function unavailablePage(): string {
  return statusPage(
    "410",
    "This site is unavailable",
    "It has been taken offline."
  );
}

export function previewClosedPage(): string {
  return statusPage(
    "410",
    "This preview is closed",
    "Its pull request was closed or the preview was deleted. The live site may already have the changes."
  );
}

export function serviceErrorPage(): string {
  return statusPage(
    "503",
    "Temporarily unavailable",
    "Please try again in a moment."
  );
}

function passwordForm(next: string, error: PreviewGateError | null): string {
  const passwordError =
    error === "wrong_password" || error === "too_many_attempts";
  const describedBy = passwordError
    ? ' aria-invalid="true" aria-describedby="password-error"'
    : "";
  const message = passwordError
    ? `<p class="error" id="password-error" role="alert">${GATE_ERROR_MESSAGES[error]}</p>`
    : "";
  return `<div class="divider">or</div><form method="post" action="${SITE_PREVIEW_AUTH_PATH}"><input type="hidden" name="next" value="${escapeHtml(next)}"><div><label for="password">Preview password</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="128"${describedBy}${passwordError ? " autofocus" : ""}></div>${message}<button class="button secondary" type="submit">Continue with password</button></form>`;
}

export function previewLockedPage(params: PreviewGatePage): string {
  const { signInUrl, passwordEnabled, next, error } = params;
  let notice = "";
  if (error === "forbidden" && passwordEnabled) {
    notice = `<p class="notice" role="status">Your Notra account doesn't have access to this site. Enter the preview password or ask for a share link.</p>`;
  } else if (error === "forbidden" || error === "invalid_link") {
    notice = `<p class="notice" role="status">${GATE_ERROR_MESSAGES[error]}</p>`;
  }
  const lead = passwordEnabled
    ? "Sign in with a Notra account that has access to this site, or enter the preview password."
    : "Sign in with a Notra account that has access to this site, or ask for a share link.";
  const form = passwordEnabled ? passwordForm(next, error) : "";
  return page({
    title: "Private preview",
    body: `<div class="icon">${LOCK_ICON_SVG}</div><h1>This preview is private</h1><p>${lead}</p>${notice}<div class="actions"><a class="button primary" href="${escapeHtml(signInUrl)}"><span class="chip">${NOTRA_MARK_CHIP_SVG}</span>Continue with Notra</a>${form}</div>`,
  });
}

export function hostingApexPage(hostingDomain: string): string {
  const domain = escapeHtml(hostingDomain);
  return page({
    title: `${hostingDomain} · Notra Sites`,
    body: `<div class="icon">${GLOBE_ICON_SVG}</div><h1>${domain}</h1><p>Blogs and changelogs published with <a href="${NOTRA_HOME_URL}">Notra</a>. Every subdomain belongs to a Notra customer.</p><div class="frame"><div class="rows"><div class="row"><span>Abuse, phishing or malware</span><a href="mailto:${SITES_ABUSE_EMAIL}">${SITES_ABUSE_EMAIL}</a></div><div class="row"><span>Security issues</span><a href="mailto:${SITES_SECURITY_EMAIL}">${SITES_SECURITY_EMAIL}</a></div></div><p class="frame-foot">Include the full address of the site you are reporting.</p></div>`,
  });
}

export function securityTxt(origin: string, now: Date): string {
  const expires = new Date(
    now.getTime() + SECURITY_TXT_LIFETIME_DAYS * 24 * 60 * 60 * 1000
  );
  return [
    `Contact: mailto:${SITES_SECURITY_EMAIL}`,
    `Contact: mailto:${SITES_ABUSE_EMAIL}`,
    `Expires: ${expires.toISOString()}`,
    `Canonical: ${origin}/.well-known/security.txt`,
    "Preferred-Languages: en, de",
    "",
  ].join("\n");
}
