/**
 * Provisions the Brew side of Notra email: sending domains, one pass-through
 * design, one trigger + published automation per email type, the contact
 * fields the app syncs, and a marketing opt-in audience.
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

interface Sender {
  domain: string;
  fromAddress: string;
  fromName: string;
  replyTo: string;
}

interface BrewDomain {
  domainId: string;
  name: string;
  sendable: boolean;
  sendingPurpose: "marketing" | "transactional";
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
  test: {
    notifications: {
      domain: "jan-test.usenotra.com",
      fromAddress: "hello@jan-test.usenotra.com",
      fromName: "Notra",
      replyTo: "support@usenotra.com",
    },
    founder: {
      domain: "jan-test.usenotra.com",
      fromAddress: "hello@jan-test.usenotra.com",
      fromName: "Dominik from Notra",
      replyTo: "dominik@usenotra.com",
    },
  },
  production: {
    notifications: {
      domain: "notifications.usenotra.com",
      fromAddress: "notifications@notifications.usenotra.com",
      fromName: "Notra",
      replyTo: "support@usenotra.com",
    },
    founder: {
      domain: "hello.usenotra.com",
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
const DESIGN_TITLE = `${NAME_PREFIX}Rendered React Email`;
// `message` is an object so Brew keeps it as template data instead of
// copying subject and HTML onto the contact.
const DESIGN_HTML = "{{ message.html | raw }}";
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
  name: string,
  existing: BrewDomain[]
): Promise<BrewDomain> {
  let domain = existing.find((row) => row.name === name);

  if (!domain) {
    domain = await api<BrewDomain>("POST", "/domains", {
      name,
      sendingPurpose: "transactional",
    });
    console.log(`Added domain ${name}`);
  } else if (domain.sendingPurpose !== "transactional") {
    domain = await api<BrewDomain>("PATCH", `/domains/${domain.domainId}`, {
      sendingPurpose: "transactional",
    });
    console.log(`Switched ${name} to transactional`);
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
    const name = senders[role].domain;
    const domain = resolved.get(name) ?? (await ensureDomain(name, existing));
    resolved.set(name, domain);
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

async function ensureDesign() {
  const emails = await list<BrewEmail>("/emails");
  const existing = emails.find((email) => email.title === DESIGN_TITLE);
  if (existing) {
    return existing;
  }

  const created = await api<BrewEmail>("POST", "/emails/import", {
    format: "html",
    title: DESIGN_TITLE,
    content: DESIGN_HTML,
  });
  console.log(`Imported design ${DESIGN_TITLE}`);
  return created;
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
  const design = await ensureDesign();
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

    await ensureAutomation(
      name,
      trigger.triggerEventId,
      buildSendConfig(design, senders[role], domainIds[role]),
      automations.find((automation) => automation.name === name)
    );
  }

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
