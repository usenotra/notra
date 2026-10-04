import "@tanstack/react-start/server-only";
import { db } from "@notra/db/drizzle";
import {
  members,
  organizationNotificationSettings,
  users,
} from "@notra/db/schema";
import type { BrewContactInput } from "@notra/email/types/brew";
import {
  deleteBrewContact,
  isBrewConfigured,
  listBrewContacts,
  upsertBrewContacts,
} from "@notra/email/utils/brew";
import { and, type AnyColumn, eq, inArray, sql } from "drizzle-orm";

import {
  BREW_CONTACTS_LOGGED_ERROR_LIMIT,
  BREW_CONTACTS_MAX_PRUNE_RATIO,
  BREW_CONTACTS_PRUNE_FLOOR,
} from "@/constants/email/brew-contacts";

const WHITESPACE_REGEX = /\s+/;

/**
 * True when any organization the user owns has the flag on. Only owners get
 * these emails, and a missing settings row falls back the way the senders do.
 */
function ownedOrganizationsWith(column: AnyColumn, missingRowDefault: boolean) {
  return sql<boolean>`coalesce(bool_or(${members.role} = 'owner' and coalesce(${column}, ${sql.raw(String(missingRowDefault))})), false)`;
}

function splitName(name: string, email: string) {
  // Users without a real name have their email (or its local part) as name.
  if (name === email || name === email.split("@")[0]) {
    return {};
  }

  const [firstName, ...rest] = name.trim().split(WHITESPACE_REGEX);
  return { firstName, lastName: rest.join(" ") };
}

async function loadContacts(userIds?: string[]): Promise<BrewContactInput[]> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      createdAt: users.createdAt,
      marketingOptInAt: users.marketingOptInAt,
      marketingOptInEvidence: users.marketingOptInEvidence,
      marketingOptInPolicyVersion: users.marketingOptInPolicyVersion,
      dailySummaryEmails: ownedOrganizationsWith(
        organizationNotificationSettings.dailySummary,
        true
      ),
      contentCreatedEmails: ownedOrganizationsWith(
        organizationNotificationSettings.scheduledContentCreation,
        false
      ),
      contentFailedEmails: ownedOrganizationsWith(
        organizationNotificationSettings.scheduledContentFailed,
        false
      ),
      contentSkippedEmails: ownedOrganizationsWith(
        organizationNotificationSettings.scheduledContentSkipped,
        false
      ),
    })
    .from(users)
    .leftJoin(members, eq(members.userId, users.id))
    .leftJoin(
      organizationNotificationSettings,
      eq(
        organizationNotificationSettings.organizationId,
        members.organizationId
      )
    )
    .where(userIds ? inArray(users.id, userIds) : undefined)
    .groupBy(users.id);

  return rows.map(
    ({
      id,
      email,
      name,
      createdAt,
      marketingOptInAt,
      marketingOptInEvidence,
      marketingOptInPolicyVersion,
      ...preferences
    }) => ({
      email,
      ...splitName(name, email),
      customFields: {
        notraUserId: id,
        signedUpAt: createdAt.toISOString(),
        marketingEmails: marketingOptInAt !== null,
        ...preferences,
      },
      ...(marketingOptInAt &&
        marketingOptInEvidence &&
        marketingOptInPolicyVersion && {
          consent: {
            source: "form" as const,
            capturedAt: marketingOptInAt.toISOString(),
            policyVersion: marketingOptInPolicyVersion,
            evidence: marketingOptInEvidence,
          },
        }),
    })
  );
}

/** Upserts the given users, or every user when called without ids. */
export async function syncBrewContacts(userIds?: string[]) {
  if (!isBrewConfigured() || userIds?.length === 0) {
    return { synced: 0, failed: 0 };
  }

  const contacts = await loadContacts(userIds);
  const { failed, errors } = await upsertBrewContacts(contacts);

  if (errors.length > 0) {
    console.error("[BrewContacts] Upsert failed", {
      failed,
      errors: errors.slice(0, BREW_CONTACTS_LOGGED_ERROR_LIMIT),
    });
  }

  return { synced: contacts.length - failed, failed };
}

/**
 * Deletes Brew contacts whose Notra user no longer exists, catching account
 * deletions whose immediate Brew delete failed. Contacts Brew got from
 * anywhere else (no `notraUserId`) are left alone.
 */
export async function pruneBrewContacts() {
  if (!isBrewConfigured()) {
    return { pruned: 0 };
  }

  const listed = await listBrewContacts();
  if (!listed.ok) {
    throw new Error(`Failed to list Brew contacts: ${listed.error.message}`);
  }

  const synced = listed.data.filter(
    (contact) => contact.customFields?.notraUserId
  );
  const userIds = synced.map(
    (contact) => contact.customFields?.notraUserId ?? ""
  );
  const existing = new Set(
    userIds.length === 0
      ? []
      : (
          await db
            .select({ id: users.id })
            .from(users)
            .where(inArray(users.id, userIds))
        ).map((user) => user.id)
  );
  const orphans = synced.filter(
    (contact) => !existing.has(contact.customFields?.notraUserId ?? "")
  );

  const pruneLimit = Math.max(
    BREW_CONTACTS_PRUNE_FLOOR,
    synced.length * BREW_CONTACTS_MAX_PRUNE_RATIO
  );
  if (orphans.length > pruneLimit) {
    throw new Error(
      `Refusing to prune ${orphans.length} of ${synced.length} Brew contacts`
    );
  }

  for (const contact of orphans) {
    await deleteBrewContact(contact.email);
  }

  return { pruned: orphans.length };
}

export async function syncBrewContactsForOrganizationOwners(
  organizationId: string
) {
  const owners = await db
    .select({ userId: members.userId })
    .from(members)
    .where(
      and(eq(members.organizationId, organizationId), eq(members.role, "owner"))
    );

  return syncBrewContacts(owners.map((owner) => owner.userId));
}
