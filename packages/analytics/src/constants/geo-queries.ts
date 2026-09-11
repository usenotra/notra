import { p } from "@tinybirdco/sdk";

import { TRAILING_DAYS_PARAM } from "./analytics-params";

// Shared project scope and date-window plumbing for GEO traffic endpoints.
export const GEO_PROJECT_SCOPE_PARAMS = {
  project_id: p
    .string()
    .optional("")
    .describe("Project id filter, empty for every project"),
  include_unassigned: p
    .int32()
    .optional(0)
    .describe("Set to 1 to include rows captured before project scoping"),
};

export const GEO_EXCLUDED_SOURCES_PARAMS = {
  excluded_sources: p
    .string()
    .optional("")
    .describe("Comma-separated traffic sources to hide, empty for none"),
};

export const GEO_WINDOW_PARAMS = {
  ...TRAILING_DAYS_PARAM,
  date_from: p
    .string()
    .optional("")
    .describe("Inclusive first day (YYYY-MM-DD); empty for days window"),
  date_to: p
    .string()
    .optional("")
    .describe("Inclusive last day (YYYY-MM-DD); empty for open end"),
};

export const GEO_DAY_CURRENT_CONDITION = `if(
            {{String(date_from, '')}} = '',
            day >= toDate(now() - toIntervalDay({{Int32(days, 30)}})),
            day >= toDateOrNull({{String(date_from, '')}})
          )
          AND ({{String(date_to, '')}} = '' OR day <= toDateOrNull({{String(date_to, '')}}))`;

export const GEO_DAY_PREVIOUS_CONDITION = `if(
            {{String(date_from, '')}} = '',
            day >= toDate(now() - toIntervalDay({{Int32(days, 30)}} * 2))
              AND day < toDate(now() - toIntervalDay({{Int32(days, 30)}})),
            day >= toDateOrNull({{String(date_from, '')}}) - toIntervalDay(
              dateDiff(
                'day',
                toDateOrNull({{String(date_from, '')}}),
                if(
                  {{String(date_to, '')}} = '',
                  toDate(now()),
                  toDateOrNull({{String(date_to, '')}})
                )
              ) + 1
            )
            AND day < toDateOrNull({{String(date_from, '')}})
          )`;

export const GEO_DAY_WINDOW_SQL = `AND (${GEO_DAY_CURRENT_CONDITION})`;

export const GEO_DAY_COMPARISON_WINDOW_SQL = `AND ((${GEO_DAY_CURRENT_CONDITION}) OR (${GEO_DAY_PREVIOUS_CONDITION}))`;

export const GEO_CAPTURED_WINDOW_SQL = `AND if(
            {{String(date_from, '')}} = '',
            captured_at >= now() - toIntervalDay({{Int32(days, 30)}}),
            toDate(captured_at) >= toDateOrNull({{String(date_from, '')}})
          )
          AND ({{String(date_to, '')}} = '' OR toDate(captured_at) <= toDateOrNull({{String(date_to, '')}}))`;

export const GEO_CAPTURED_CURRENT_CONDITION = `if(
            {{String(date_from, '')}} = '',
            toDate(captured_at) >= toDate(now() - toIntervalDay({{Int32(days, 30)}})),
            toDate(captured_at) >= toDateOrNull({{String(date_from, '')}})
          )
          AND ({{String(date_to, '')}} = '' OR toDate(captured_at) <= toDateOrNull({{String(date_to, '')}}))`;

export const GEO_CAPTURED_PREVIOUS_CONDITION = `if(
            {{String(date_from, '')}} = '',
            toDate(captured_at) >= toDate(now() - toIntervalDay({{Int32(days, 30)}} * 2))
              AND toDate(captured_at) < toDate(now() - toIntervalDay({{Int32(days, 30)}})),
            toDate(captured_at) >= toDateOrNull({{String(date_from, '')}}) - toIntervalDay(
              dateDiff(
                'day',
                toDateOrNull({{String(date_from, '')}}),
                if(
                  {{String(date_to, '')}} = '',
                  toDate(now()),
                  toDateOrNull({{String(date_to, '')}})
                )
              ) + 1
            )
            AND toDate(captured_at) < toDateOrNull({{String(date_from, '')}})
          )`;

export const GEO_PROJECT_SCOPE_SQL = `AND (
            {{String(project_id, '')}} = ''
            OR project_id = {{String(project_id, '')}}
            OR ({{Int32(include_unassigned, 0)}} = 1 AND project_id = '')
          )`;

export const GEO_EXCLUDED_SOURCES_SQL = `AND (
            {{String(excluded_sources, '')}} = ''
            OR NOT has(splitByChar(',', {{String(excluded_sources, '')}}), source)
          )`;

export const GEO_HOST_FILTER_PARAMS = {
  host: p
    .string()
    .optional("")
    .describe("Hostname filter, empty for every host. Subdomains match."),
};

export const GEO_HOST_FILTER_SQL = `AND (
            {{String(host, '')}} = ''
            OR if(
              startsWith(lowerUTF8(host), 'www.'),
              substring(lowerUTF8(host), 5),
              lowerUTF8(host)
            ) = {{String(host, '')}}
            OR endsWith(
              if(
                startsWith(lowerUTF8(host), 'www.'),
                substring(lowerUTF8(host), 5),
                lowerUTF8(host)
              ),
              concat('.', {{String(host, '')}})
            )
          )`;
