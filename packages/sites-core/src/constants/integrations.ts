export const UMAMI_SCRIPT_URL = "https://cloud.umami.is/script.js";
export const UMAMI_CONNECT_ORIGIN = "https://gateway.umami.is";

export const PLAUSIBLE_SCRIPT_URL = "https://plausible.io/js/script.js";

export const POSTHOG_DEFAULT_API_HOST = "https://us.i.posthog.com";
export const POSTHOG_CSP_ORIGIN = "https://*.posthog.com";
export const POSTHOG_LOADER =
  '!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);';

const HOST = String.raw`(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}`;
const PORT = String.raw`(?::(?:\d{1,4}|[0-5]\d{4}|6[0-4]\d{3}|65[0-4]\d{2}|655[0-2]\d|6553[0-5]))?`;
export const HOSTNAME = new RegExp(`^${HOST}$`);
export const HOSTNAME_WITH_PORT = new RegExp(`^${HOST}${PORT}$`);
export const HTTPS_BASE_URL = new RegExp(
  String.raw`^https:\/\/${HOST}${PORT}(?:\/[A-Za-z0-9._~-]+)*\/*$`
);
export const HTTPS_SCRIPT_URL = new RegExp(
  String.raw`^https:\/\/${HOST}${PORT}(?:\/(?!\.{1,2}(?:\/|$))[A-Za-z0-9._~-]+)+$`
);
export const CSP_ORIGIN = new RegExp(
  String.raw`^(?:https|wss):\/\/(?:\*\.)?${HOST}${PORT}$`
);

export const POSTHOG_API_KEY = /^phc_[A-Za-z0-9]{20,64}$/;
