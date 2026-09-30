/**
 * Query the WorkOS Widgets OpenAPI spec for specific widget endpoints.
 *
 * Source file — build with: pnpm build:query-spec
 * Runtime usage (via bundled .cjs):
 *   node references/scripts/query-spec.cjs --widget UserProfile
 *   node references/scripts/query-spec.cjs --widget UserManagement
 *   node references/scripts/query-spec.cjs --widget admin-portal
 *   node references/scripts/query-spec.cjs --path /_widgets/UserProfile/me
 *   node references/scripts/query-spec.cjs --list
 *
 * Outputs matching endpoints with their request/response schemas (resolved $refs).
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parse } from 'yaml';

// Support both ESM (import.meta.url) and CJS (__dirname) for bundled output
const _dir = typeof __dirname !== 'undefined' ? __dirname : dirname(new URL(import.meta.url).pathname);
const SPEC_PATH = join(_dir, '../widgets-open-api-spec.yaml');

export const WIDGET_PREFIXES: Record<string, string> = {
  // Primary names (match SKILL.md widget slugs)
  'user-management': '/_widgets/UserManagement',
  'user-profile': '/_widgets/UserProfile',
  'admin-portal-sso-connection': '/_widgets/admin-portal/sso-connections',
  'admin-portal-domain-verification': '/_widgets/admin-portal/organization-domains',
  // Alternate forms
  usermanagement: '/_widgets/UserManagement',
  userprofile: '/_widgets/UserProfile',
  'admin-portal': '/_widgets/admin-portal',
  adminportal: '/_widgets/admin-portal',
  'sso-connection': '/_widgets/admin-portal/sso-connections',
  'domain-verification': '/_widgets/admin-portal/organization-domains',
  apikeys: '/_widgets/ApiKeys',
  dataintegrations: '/_widgets/DataIntegrations',
  'directory-sync': '/_widgets/directory-sync',
  settings: '/_widgets/settings',
};

export function loadSpec(path?: string) {
  return parse(readFileSync(path ?? SPEC_PATH, 'utf-8'));
}

export function resolveRef(spec: Record<string, unknown>, ref: string): unknown {
  const parts = ref.replace('#/', '').split('/');
  let current: unknown = spec;
  for (const part of parts) {
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

export function resolveSchema(spec: Record<string, unknown>, schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) {
    return schema.map((item) => resolveSchema(spec, item));
  }
  const s = schema as Record<string, unknown>;
  if (s.$ref && typeof s.$ref === 'string') {
    return resolveSchema(spec, resolveRef(spec, s.$ref));
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(s)) {
    if (value && typeof value === 'object') {
      result[key] = resolveSchema(spec, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export interface EndpointInfo {
  path: string;
  method: string;
  description?: string;
  parameters?: unknown;
  requestBody?: unknown;
  responses: Record<string, unknown>;
}

export function extractEndpoints(spec: Record<string, unknown>, pathFilter: (path: string) => boolean): EndpointInfo[] {
  const paths = spec.paths as Record<string, Record<string, unknown>> | undefined;
  if (!paths) return [];

  const endpoints: EndpointInfo[] = [];
  for (const [path, methods] of Object.entries(paths)) {
    if (!pathFilter(path)) continue;
    for (const [method, operation] of Object.entries(methods)) {
      if (!operation || typeof operation !== 'object') continue;
      const op = operation as Record<string, unknown>;

      const responses: Record<string, unknown> = {};
      const opResponses = op.responses as Record<string, unknown> | undefined;
      if (opResponses) {
        for (const [code, resp] of Object.entries(opResponses)) {
          const r = resp as Record<string, unknown>;
          const content = r?.content as Record<string, unknown> | undefined;
          const json = content?.['application/json'] as Record<string, unknown> | undefined;
          if (json?.schema) {
            responses[code] = {
              description: r.description,
              schema: resolveSchema(spec, json.schema),
            };
          } else {
            responses[code] = { description: r?.description };
          }
        }
      }

      const endpoint: EndpointInfo = {
        path,
        method: method.toUpperCase(),
        responses,
      };

      if (op.description) endpoint.description = op.description as string;
      if (op.parameters) endpoint.parameters = op.parameters;
      if (op.requestBody) {
        const body = op.requestBody as Record<string, unknown>;
        const content = body.content as Record<string, unknown> | undefined;
        const json = content?.['application/json'] as Record<string, unknown> | undefined;
        if (json?.schema) {
          endpoint.requestBody = resolveSchema(spec, json.schema);
        }
      }

      endpoints.push(endpoint);
    }
  }
  return endpoints;
}

export function formatEndpoint(ep: EndpointInfo): string {
  const lines: string[] = [];
  lines.push(`## ${ep.method} ${ep.path}`);
  if (ep.description) lines.push(`\n${ep.description}`);

  if (ep.parameters && Array.isArray(ep.parameters) && ep.parameters.length > 0) {
    lines.push('\n### Parameters\n');
    for (const p of ep.parameters) {
      const param = p as Record<string, unknown>;
      lines.push(`- \`${param.name}\` (${param.in}): ${param.schema ? JSON.stringify(param.schema) : 'unknown'}`);
    }
  }

  if (ep.requestBody) {
    lines.push('\n### Request Body\n');
    lines.push('```json');
    lines.push(JSON.stringify(ep.requestBody, null, 2));
    lines.push('```');
  }

  for (const [code, resp] of Object.entries(ep.responses)) {
    const r = resp as Record<string, unknown>;
    lines.push(`\n### Response ${code}${r.description ? ` — ${r.description}` : ''}\n`);
    if (r.schema) {
      lines.push('```json');
      lines.push(JSON.stringify(r.schema, null, 2));
      lines.push('```');
    }
  }

  return lines.join('\n');
}

export function groupPathsByWidget(paths: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const p of paths) {
    const parts = p.split('/').filter(Boolean);
    const group = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0] || 'other';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(p);
  }
  return grouped;
}

// --- CLI (only runs when executed directly) ---

const isDirectExecution = process.argv[1]?.includes('query-spec');

if (isDirectExecution) {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    const spec = loadSpec();
    const grouped = groupPathsByWidget(Object.keys(spec.paths ?? {}));
    for (const [group, groupPaths] of Object.entries(grouped)) {
      console.log(`\n${group}:`);
      for (const p of groupPaths) console.log(`  ${p}`);
    }
    process.exit(0);
  }

  const widgetIdx = args.indexOf('--widget');
  const pathIdx = args.indexOf('--path');

  if (widgetIdx === -1 && pathIdx === -1) {
    console.error('Usage: query-spec.ts --widget <name> | --path <path> | --list');
    console.error('Widgets:', Object.keys(WIDGET_PREFIXES).join(', '));
    process.exit(1);
  }

  const spec = loadSpec();
  let filter: (path: string) => boolean;

  if (widgetIdx !== -1) {
    const widgetName = (args[widgetIdx + 1] || '').toLowerCase();
    const prefix = WIDGET_PREFIXES[widgetName];
    if (!prefix) {
      console.error(`Unknown widget: ${args[widgetIdx + 1]}`);
      console.error('Known widgets:', Object.keys(WIDGET_PREFIXES).join(', '));
      process.exit(1);
    }
    filter = (path) => path.startsWith(prefix);
  } else {
    const pathPattern = args[pathIdx + 1] || '';
    filter = (path) => path.includes(pathPattern);
  }

  const endpoints = extractEndpoints(spec, filter);

  if (endpoints.length === 0) {
    console.error('No matching endpoints found.');
    process.exit(1);
  }

  console.log(`# Matched ${endpoints.length} endpoint(s)\n`);
  for (const ep of endpoints) {
    console.log(formatEndpoint(ep));
    console.log('\n---\n');
  }
}
