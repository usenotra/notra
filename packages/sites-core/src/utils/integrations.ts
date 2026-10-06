import {
  DATABUDDY_CONNECT_ORIGIN,
  DATABUDDY_SCRIPT_URL,
  GOOGLE_ANALYTICS_CONNECT_ORIGINS,
  GOOGLE_TAG_ORIGIN,
  PLAUSIBLE_SCRIPT_URL,
  POSTHOG_CSP_ORIGIN,
  POSTHOG_DEFAULT_API_HOST,
  POSTHOG_LOADER,
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
  const { databuddy, plausible, posthog, ga4 } = integrations;

  if (databuddy) {
    scripts.push({
      kind: "external",
      src: DATABUDDY_SCRIPT_URL,
      attributes: {
        "data-client-id": databuddy.clientId,
        crossorigin: "anonymous",
        async: true,
      },
    });
  }
  if (plausible) {
    scripts.push({
      kind: "external",
      src: PLAUSIBLE_SCRIPT_URL,
      attributes: { "data-domain": plausible.domain, defer: true },
    });
  }
  if (posthog) {
    const options = { api_host: posthog.apiHost ?? POSTHOG_DEFAULT_API_HOST };
    scripts.push({
      kind: "inline",
      code: `${POSTHOG_LOADER}posthog.init(${inlineScriptLiteral(posthog.apiKey)},${inlineScriptLiteral(options)});`,
    });
  }
  if (ga4) {
    const id = encodeURIComponent(ga4.measurementId);
    scripts.push(
      {
        kind: "external",
        src: `${GOOGLE_TAG_ORIGIN}/gtag/js?id=${id}`,
        attributes: { async: true },
      },
      {
        kind: "inline",
        code: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config",${inlineScriptLiteral(ga4.measurementId)});`,
      }
    );
  }
  return scripts;
}

export function integrationCspSources(
  integrations: SiteIntegrations
): SiteCspSources {
  const scriptSrc: string[] = [];
  const connectSrc: string[] = [];
  const { databuddy, plausible, posthog, ga4 } = integrations;

  if (databuddy) {
    scriptSrc.push(new URL(DATABUDDY_SCRIPT_URL).origin);
    connectSrc.push(DATABUDDY_CONNECT_ORIGIN);
  }
  if (plausible) {
    const origin = new URL(PLAUSIBLE_SCRIPT_URL).origin;
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
  if (ga4) {
    scriptSrc.push(GOOGLE_TAG_ORIGIN);
    connectSrc.push(...GOOGLE_ANALYTICS_CONNECT_ORIGINS);
  }
  return { scriptSrc, connectSrc };
}
