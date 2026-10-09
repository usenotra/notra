import {
  GOOGLE_ANALYTICS_CONNECT_ORIGINS,
  GOOGLE_TAG_ORIGIN,
  PLAUSIBLE_SCRIPT_URL,
  POSTHOG_CSP_ORIGIN,
  POSTHOG_DEFAULT_API_HOST,
  POSTHOG_LOADER,
  UMAMI_CONNECT_ORIGIN,
  UMAMI_SCRIPT_URL,
} from "@notra/sites-core/constants/integrations";
import type {
  SiteCspSources,
  SiteHeadScript,
  SiteIntegrations,
} from "@notra/sites-core/types/site-integrations";

export function inlineScriptLiteral(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export function integrationHeadScripts(
  integrations: SiteIntegrations
): SiteHeadScript[] {
  const scripts: SiteHeadScript[] = [];
  const { ga4, plausible, posthog, umami } = integrations;
  if (ga4) {
    scripts.push(
      {
        kind: "external",
        src: `${GOOGLE_TAG_ORIGIN}/gtag/js?id=${encodeURIComponent(ga4.measurementId)}`,
        attributes: { async: true },
      },
      {
        kind: "inline",
        code: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config",${inlineScriptLiteral(ga4.measurementId)});`,
      }
    );
  }
  if (plausible) {
    scripts.push({
      kind: "external",
      src: plausible.server
        ? `https://${plausible.server}/js/script.js`
        : PLAUSIBLE_SCRIPT_URL,
      attributes: { "data-domain": plausible.domain, defer: true },
    });
  }
  if (posthog) {
    const options = {
      api_host: posthog.apiHost ?? POSTHOG_DEFAULT_API_HOST,
      disable_session_recording: posthog.sessionRecording === false,
    };
    scripts.push({
      kind: "inline",
      code: `${POSTHOG_LOADER}posthog.init(${inlineScriptLiteral(posthog.apiKey)},${inlineScriptLiteral(options)});`,
    });
  }
  if (umami) {
    scripts.push({
      kind: "external",
      src: umami.scriptUrl ?? UMAMI_SCRIPT_URL,
      attributes: {
        "data-website-id": umami.websiteId,
        ...(umami.hostUrl ? { "data-host-url": umami.hostUrl } : {}),
        defer: true,
      },
    });
  }
  return scripts;
}

export function integrationCspSources(
  integrations: SiteIntegrations
): SiteCspSources {
  const scriptSrc: string[] = [];
  const connectSrc: string[] = [];
  const { ga4, plausible, posthog, umami } = integrations;
  if (ga4) {
    scriptSrc.push(GOOGLE_TAG_ORIGIN);
    connectSrc.push(...GOOGLE_ANALYTICS_CONNECT_ORIGINS);
  }
  if (plausible) {
    const origin = plausible.server
      ? `https://${plausible.server}`
      : new URL(PLAUSIBLE_SCRIPT_URL).origin;
    scriptSrc.push(origin);
    connectSrc.push(origin);
  }
  if (posthog) {
    scriptSrc.push(POSTHOG_CSP_ORIGIN);
    connectSrc.push(POSTHOG_CSP_ORIGIN);
    if (posthog.apiHost) {
      const origin = new URL(posthog.apiHost).origin;
      scriptSrc.push(origin);
      connectSrc.push(origin);
    }
  }
  if (umami) {
    const scriptOrigin = new URL(umami.scriptUrl ?? UMAMI_SCRIPT_URL).origin;
    let connectOrigin = scriptOrigin;
    if (umami.hostUrl) {
      connectOrigin = new URL(umami.hostUrl).origin;
    } else if (scriptOrigin === new URL(UMAMI_SCRIPT_URL).origin) {
      connectOrigin = UMAMI_CONNECT_ORIGIN;
    }
    scriptSrc.push(scriptOrigin);
    connectSrc.push(connectOrigin);
  }
  return { scriptSrc, connectSrc };
}
