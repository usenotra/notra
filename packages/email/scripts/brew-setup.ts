/**
 * Provisions the Brew side of Notra email: sending domains, pass-through
 * designs, one strict trigger + published automation per email type, the
 * contact fields the app syncs, and a marketing opt-in audience.
 *
 *   bun run brew:setup -- --profile test
 *   bun run brew:setup -- --profile production
 *
 * Safe to re-run. Objects are matched by name. On an existing automation only
 * the node with id "send" is reconciled, so steps added in Brew survive.
 */
import {
  BREW_CONTACT_FIELD_TYPES,
  BREW_EMAIL_TRIGGERS,
} from "../src/constants/brew";
import type { BrewEmailCategory, BrewRequestInit } from "../src/types/brew";
import { brewRequest } from "../src/utils/brew";

type Profile = "test" | "production";
type SenderRole = "notifications" | "founder";
type SendingPurpose = "marketing" | "transactional";

interface Sender {
  domain: string;
  /**
   * Brew's split: transactional for mail the person triggered (notifications),
   * marketing for lifecycle mail (welcome), which adds unsubscribe handling.
   * Keep the two on separate subdomains to isolate reputation.
   */
  purpose: SendingPurpose;
  fromAddress: string;
  fromName: string;
  replyTo: string;
}

interface BrewDomain {
  domainId: string;
  name: string;
  sendable: boolean;
  sendingPurpose: SendingPurpose;
  records?: { type?: string; name?: string; value?: string }[];
}

interface BrewEmail {
  emailId: string;
  emailVersionId: string;
  title: string;
}

interface BrewTrigger {
  triggerEventId: string;
  title: string;
}

interface BrewReadiness {
  ready: boolean;
  blockers: { code?: string; message?: string }[];
}

interface BrewNode {
  id: string;
  label: string;
  type: string;
  config: Record<string, unknown>;
}

interface BrewAutomation {
  automationId: string;
  automationVersionId: string;
  name: string;
  published: boolean;
  liveAutomationVersionId?: string;
  nodes: BrewNode[];
  connections: { from: string; to: string; branch?: string }[];
}

const PROFILES: Record<Profile, Record<SenderRole, Sender>> = {
  // One verified test domain, so the test welcome flow stays transactional.
  test: {
    notifications: {
      domain: "jan-test.usenotra.com",
      purpose: "transactional",
      fromAddress: "hello@jan-test.usenotra.com",
      fromName: "Notra",
      replyTo: "support@usenotra.com",
    },
    founder: {
      domain: "jan-test.usenotra.com",
      purpose: "transactional",
      fromAddress: "hello@jan-test.usenotra.com",
      fromName: "Dominik from Notra",
      replyTo: "dominik@usenotra.com",
    },
  },
  production: {
    notifications: {
      domain: "notifications.usenotra.com",
      purpose: "transactional",
      fromAddress: "notifications@notifications.usenotra.com",
      fromName: "Notra",
      replyTo: "support@usenotra.com",
    },
    founder: {
      domain: "hello.usenotra.com",
      purpose: "marketing",
      fromAddress: "dominik@hello.usenotra.com",
      fromName: "Dominik from Notra",
      replyTo: "dominik@usenotra.com",
    },
  },
};

const EMAILS: Record<BrewEmailCategory, { label: string; sender: SenderRole }> =
  {
    welcome: { label: "Welcome", sender: "founder" },
    feedback: { label: "Product feedback", sender: "notifications" },
    contact: { label: "Contact form message", sender: "notifications" },
    "ai-credits-depleted": {
      label: "AI credits depleted",
      sender: "notifications",
    },
    "workflow-paused": { label: "Workflow paused", sender: "notifications" },
    "schedule-content-created": {
      label: "Scheduled content created",
      sender: "notifications",
    },
    "schedule-content-failed": {
      label: "Scheduled content failed",
      sender: "notifications",
    },
    "schedule-content-skipped": {
      label: "Scheduled content skipped",
      sender: "notifications",
    },
    "daily-summary": { label: "Daily GEO summary", sender: "notifications" },
  };

const NAME_PREFIX = "Notra · ";
const MARKETING_AUDIENCE_NAME = `${NAME_PREFIX}Marketing opt-in`;
// `message` is an object so Brew keeps it as template data instead of
// copying subject and HTML onto the contact.
const RENDERED_HTML = "{{ message.html | raw }}";
// Brew swaps `#unsubscribe` for a signed per-recipient link on marketing sends.
const UNSUBSCRIBE_FOOTER =
  '<p style="margin:0 0 32px;text-align:center;font-family:sans-serif;font-size:12px;color:#717175">Don\'t want these emails? <a href="#unsubscribe" style="color:#717175;text-decoration:underline">Unsubscribe</a></p>';
const DESIGNS: Record<SendingPurpose, { title: string; html: string }> = {
  transactional: {
    title: `${NAME_PREFIX}Rendered React Email`,
    html: RENDERED_HTML,
  },
  marketing: {
    title: `${NAME_PREFIX}Rendered React Email (marketing)`,
    html: `${RENDERED_HTML}${UNSUBSCRIBE_FOOTER}`,
  },
};
const SUBJECT_TAG = "{{ message.subject }}";
const TRIGGER_NODE_ID = "trigger";
const SEND_NODE_ID = "send";
const RECONCILED_SEND_FIELDS = [
  "emailId",
  "emailVersionId",
  "domainId",
  "subject",
  "fromName",
  "fromAddress",
  "replyTo",
] as const;

const PAYLOAD_SCHEMA = {
  type: "object",
  fields: [
    { key: "email", type: "string", required: true },
    {
      key: "message",
      type: "object",
      required: true,
      children: [
        { key: "subject", type: "string", required: true },
        { key: "html", type: "string", required: true },
      ],
    },
  ],
};

/**
 * No default: profiles only differ in sender, so running the wrong one against
 * a live brand would repoint and publish every automation's send step.
 */
function parseProfile(): Profile {
  const index = process.argv.indexOf("--profile");
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (value !== "test" && value !== "production") {
    throw new Error(
      `Pass --profile test or --profile production (got "${value ?? ""}")`
    );
  }
  return value;
}

async function api<T>(
  method: BrewRequestInit["method"],
  path: string,
  body?: unknown
): Promise<T> {
  const result = await brewRequest<T>(path, { method, body });
  if (!result.ok) {
    throw new Error(
      `${method} ${path} → ${result.error.name}: ${result.error.message}`
    );
  }
  return result.data;
}

async function list<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  let cursor: string | null = null;

  do {
    const separator = path.includes("?") ? "&" : "?";
    const query = cursor
      ? `${separator}cursor=${encodeURIComponent(cursor)}`
      : "";
    const page: { data: T[]; pagination: { cursor: string | null } } =
      await api("GET", `${path}${query}`);
    rows.push(...page.data);
    cursor = page.pagination.cursor;
  } while (cursor !== null);

  return rows;
}

async function ensureDomain(
  { domain: name, purpose }: Sender,
  existing: BrewDomain[]
): Promise<BrewDomain> {
  let domain = existing.find((row) => row.name === name);

  if (!domain) {
    domain = await api<BrewDomain>("POST", "/domains", {
      name,
      sendingPurpose: purpose,
    });
    console.log(`Added ${purpose} domain ${name}`);
  } else if (domain.sendingPurpose !== purpose) {
    domain = await api<BrewDomain>("PATCH", `/domains/${domain.domainId}`, {
      sendingPurpose: purpose,
    });
    console.log(`Switched ${name} to ${purpose}`);
  }

  if (!domain.sendable) {
    console.log(`\n${name} is not verified yet. DNS records:`);
    for (const record of domain.records ?? []) {
      console.log(`  ${record.type}\t${record.name}\t${record.value}`);
    }
  }

  return domain;
}

/** Resolves each sender role to a verified domain id. */
async function ensureSenderDomains(
  senders: Record<SenderRole, Sender>
): Promise<Record<SenderRole, string>> {
  const existing = await list<BrewDomain>("/domains");
  const resolved = new Map<string, BrewDomain>();
  const resolve = async (role: SenderRole) => {
    const sender = senders[role];
    const domain =
      resolved.get(sender.domain) ?? (await ensureDomain(sender, existing));
    if (domain.sendingPurpose !== sender.purpose) {
      throw new Error(
        `${sender.domain} can't be ${domain.sendingPurpose} and ${sender.purpose}`
      );
    }
    resolved.set(sender.domain, domain);
    return domain;
  };

  const notifications = await resolve("notifications");
  const founder = await resolve("founder");
  if (!(notifications.sendable && founder.sendable)) {
    throw new Error(
      "Verify the domains above in DNS (Brew → Domains → Verify), then re-run"
    );
  }

  return { notifications: notifications.domainId, founder: founder.domainId };
}

async function ensureContactFields() {
  const existing = new Set(
    (await list<{ fieldName: string }>("/fields")).map((row) => row.fieldName)
  );

  for (const [fieldName, fieldType] of Object.entries(
    BREW_CONTACT_FIELD_TYPES
  )) {
    if (!existing.has(fieldName)) {
      await api("POST", "/fields", { fieldName, fieldType });
      console.log(`Created contact field ${fieldName} (${fieldType})`);
    }
  }
}

async function ensureMarketingAudience() {
  const audiences = await list<{ audienceName: string }>("/audiences");
  if (
    audiences.some(
      (audience) => audience.audienceName === MARKETING_AUDIENCE_NAME
    )
  ) {
    return;
  }

  await api("POST", "/audiences", {
    name: MARKETING_AUDIENCE_NAME,
    filters: {
      filters: [
        { field: "marketingEmails", operator: "is_true", type: "boolean" },
      ],
      logicalOperator: "and",
    },
  });
  console.log(`Created audience ${MARKETING_AUDIENCE_NAME}`);
}

async function ensureDesign(
  purpose: SendingPurpose,
  existing: BrewEmail[]
): Promise<BrewEmail> {
  const { title, html } = DESIGNS[purpose];
  const design = existing.find((email) => email.title === title);
  if (design) {
    return design;
  }

  const created = await api<BrewEmail>("POST", "/emails/import", {
    format: "html",
    title,
    content: html,
  });
  console.log(`Imported design ${title}`);
  return created;
}

/** Resolves each sender role to the pass-through design for its purpose. */
async function ensureSenderDesigns(
  senders: Record<SenderRole, Sender>
): Promise<Record<SenderRole, BrewEmail>> {
  const existing = await list<BrewEmail>("/emails");
  const resolved = new Map<SendingPurpose, BrewEmail>();
  const resolve = async (role: SenderRole) => {
    const { purpose } = senders[role];
    const design =
      resolved.get(purpose) ?? (await ensureDesign(purpose, existing));
    resolved.set(purpose, design);
    return design;
  };

  return {
    notifications: await resolve("notifications"),
    founder: await resolve("founder"),
  };
}

/**
 * Brew recommends strict contracts on transactional triggers: a payload with
 * undeclared keys fails instead of sending. Enforcement can only tighten while
 * no published automation reads the trigger, so unpublish first (republished
 * right after by ensureAutomation).
 */
async function ensureStrictContract(
  name: string,
  triggerEventId: string,
  automation: BrewAutomation | undefined
) {
  const contract = await api<{ enforcement?: string }>(
    "GET",
    `/automations/triggers/${triggerEventId}/contract`
  );
  if (contract.enforcement === "strict") {
    return;
  }

  if (automation?.published) {
    await api("PATCH", `/automations/${automation.automationId}`, {
      published: false,
    });
  }
  await api("PUT", `/automations/triggers/${triggerEventId}/contract`, {
    enforcement: "strict",
  });
  console.log(`Set strict payload contract on ${name}`);
}

async function assertTriggersReady(
  triggerIds: Record<BrewEmailCategory, string>
) {
  const blocked: string[] = [];

  for (const [category, triggerEventId] of Object.entries(triggerIds)) {
    const readiness = await api<BrewReadiness>(
      "GET",
      `/automations/triggers/${triggerEventId}/readiness`
    );
    if (!readiness.ready) {
      const reasons = readiness.blockers.map((b) => b.code ?? b.message);
      blocked.push(`${category}: ${reasons.join(", ")}`);
    }
  }

  if (blocked.length > 0) {
    throw new Error(`Triggers not ready to fire:\n${blocked.join("\n")}`);
  }
}

type SendConfig = Record<(typeof RECONCILED_SEND_FIELDS)[number], string>;

function buildSendConfig(
  design: BrewEmail,
  sender: Sender,
  domainId: string
): SendConfig {
  return {
    emailId: design.emailId,
    emailVersionId: design.emailVersionId,
    domainId,
    subject: SUBJECT_TAG,
    fromName: sender.fromName,
    fromAddress: sender.fromAddress,
    replyTo: sender.replyTo,
  };
}

function createAutomation(
  name: string,
  triggerEventId: string,
  sendConfig: SendConfig
) {
  console.log(`Creating automation ${name}`);
  return api<BrewAutomation>("POST", "/automations", {
    name,
    description: "Sends the React Email HTML rendered by the Notra app.",
    triggerEventId,
    nodes: [
      {
        id: TRIGGER_NODE_ID,
        label: "Event trigger",
        type: "trigger",
        config: { mode: "event", triggerEventId },
      },
      {
        id: SEND_NODE_ID,
        label: "Send rendered email",
        type: "sendEmail",
        config: sendConfig,
      },
    ],
    connections: [{ from: TRIGGER_NODE_ID, to: SEND_NODE_ID }],
  });
}

/**
 * Brings the "send" step in line with the profile and keeps every other node.
 * Returns null for graphs reshaped in Brew without that step.
 */
async function reconcileSendStep(
  automationId: string,
  sendConfig: SendConfig
): Promise<BrewAutomation | null> {
  const automation = await api<BrewAutomation>(
    "GET",
    `/automations/${automationId}?include=graph`
  );
  const sendNode = automation.nodes.find((node) => node.id === SEND_NODE_ID);
  if (!sendNode) {
    console.warn(`! ${automation.name} has no "${SEND_NODE_ID}" step, skipped`);
    return null;
  }

  const isCurrent = RECONCILED_SEND_FIELDS.every(
    (field) => sendNode.config[field] === sendConfig[field]
  );
  if (isCurrent) {
    return automation;
  }

  console.log(`Updating send step of ${automation.name}`);
  return api<BrewAutomation>("PATCH", `/automations/${automationId}`, {
    nodes: automation.nodes.map((node) =>
      node.id === SEND_NODE_ID
        ? { ...node, config: { ...node.config, ...sendConfig } }
        : node
    ),
    connections: automation.connections,
  });
}

async function ensureAutomation(
  name: string,
  triggerEventId: string,
  sendConfig: SendConfig,
  existing: BrewAutomation | undefined
) {
  const automation = existing
    ? await reconcileSendStep(existing.automationId, sendConfig)
    : await createAutomation(name, triggerEventId, sendConfig);

  // New automations and saved edits are drafts until published.
  const isLiveLatest =
    automation?.published &&
    automation.liveAutomationVersionId === automation.automationVersionId;
  if (!automation || isLiveLatest) {
    return;
  }

  await api("PATCH", `/automations/${automation.automationId}`, {
    published: true,
  });
  console.log(`Published ${name}`);
}

async function main() {
  const profile = parseProfile();
  const senders = PROFILES[profile];
  console.log(`Profile: ${profile}`);

  await ensureContactFields();
  await ensureMarketingAudience();
  const domainIds = await ensureSenderDomains(senders);
  const designs = await ensureSenderDesigns(senders);
  const triggers = await list<BrewTrigger>("/automations/triggers");
  const automations = await list<BrewAutomation>("/automations");
  const triggerIds = {} as Record<BrewEmailCategory, string>;

  for (const [category, { label, sender: role }] of Object.entries(EMAILS) as [
    BrewEmailCategory,
    (typeof EMAILS)[BrewEmailCategory],
  ][]) {
    const name = `${NAME_PREFIX}${label}`;

    let trigger = triggers.find((row) => row.title === name);
    if (!trigger) {
      trigger = await api<BrewTrigger>("POST", "/automations/triggers", {
        title: name,
        description: `Fired by the Notra app for every "${category}" email.`,
        payloadSchema: PAYLOAD_SCHEMA,
      });
      console.log(`Created trigger ${name}`);
    }
    triggerIds[category] = trigger.triggerEventId;

    const automation = automations.find((row) => row.name === name);
    await ensureStrictContract(name, trigger.triggerEventId, automation);
    await ensureAutomation(
      name,
      trigger.triggerEventId,
      buildSendConfig(designs[role], senders[role], domainIds[role]),
      automation
    );
  }

  await assertTriggersReady(triggerIds);

  const outdated = (Object.keys(triggerIds) as BrewEmailCategory[]).filter(
    (category) => BREW_EMAIL_TRIGGERS[category] !== triggerIds[category]
  );

  if (outdated.length > 0) {
    console.log(
      `\nUpdate BREW_EMAIL_TRIGGERS in packages/email/src/constants/brew.ts:\n${JSON.stringify(triggerIds, null, 2)}`
    );
    process.exitCode = 1;
    return;
  }

  console.log("\nBrew is in sync with BREW_EMAIL_TRIGGERS.");
}

await main();
