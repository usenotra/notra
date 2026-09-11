import type { PostHogConfig } from "posthog-js";

import {
  redactPostHogEvent,
  redactPostHogNetworkRequest,
  resolvePostHogUiHost,
} from "@/utils/posthog";

export const POSTHOG_PROJECT_TOKEN =
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

export const POSTHOG_INGEST_PATH = "/ingest";

export const POSTHOG_UPSTREAM_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

export const POSTHOG_CONFIG = {
  api_host: POSTHOG_INGEST_PATH,
  ui_host: resolvePostHogUiHost(POSTHOG_UPSTREAM_HOST),
  autocapture: false,
  before_send: redactPostHogEvent,
  capture_dead_clicks: true,
  capture_exceptions: true,
  capture_pageleave: true,
  capture_pageview: "history_change",
  defaults: "2026-05-30",
  disable_capture_url_hashes: true,
  // Replays were fully masked (every text node, all inputs, all media), so
  // they showed wireframes only, while rrweb cost ~65 kB gz plus a DOM
  // mutation observer on every page. Surveys are not used. Re-enable
  // recording via PostHog's sampling/trigger config if replays are wanted;
  // the `session_recording` masking below then applies again.
  disable_session_recording: true,
  disable_surveys: true,
  enable_recording_console_log: false,
  person_profiles: "identified_only",
  save_campaign_params: false,
  save_referrer: false,
  session_recording: {
    blockSelector: "img, video, audio, canvas, iframe, object, embed",
    maskAllInputs: true,
    maskCapturedNetworkRequestFn: redactPostHogNetworkRequest,
    maskTextSelector: "*",
    recordBody: false,
    recordHeaders: false,
  },
} satisfies Partial<PostHogConfig>;
