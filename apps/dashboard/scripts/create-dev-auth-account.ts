/**
 * Creates (or repairs) a dev account for testing 2FA and passkeys against the
 * real WorkOS environment in the root `.env`.
 *
 *   cd apps/dashboard
 *   bun --env-file=../../.env scripts/create-dev-auth-account.ts
 *   bun --env-file=../../.env scripts/create-dev-auth-account.ts --reset-mfa
 *
 * `--reset-mfa` removes every enrolled TOTP factor so enrollment can be tested
 * again. Override the identity with DEV_AUTH_EMAIL / DEV_AUTH_PASSWORD.
 */

import { db } from "@notra/db/drizzle";
import { members, organizations, users } from "@notra/db/schema";
import { WorkOS } from "@workos-inc/node";
import { and, eq } from "drizzle-orm";

const EMAIL = process.env.DEV_AUTH_EMAIL ?? "mfa-demo@demo.notra.dev";
const PASSWORD = process.env.DEV_AUTH_PASSWORD ?? "MfaDemo-2026!";
const ORG_SLUG = process.env.DEV_AUTH_ORG_SLUG ?? "mfa-demo";
const ORG_NAME = "MFA Demo";
const FIRST_NAME = "MFA";
const LAST_NAME = "Demo";
const RESET_MFA = process.argv.includes("--reset-mfa");

const apiKey = process.env.WORKOS_API_KEY;
const clientId = process.env.WORKOS_CLIENT_ID;
if (!(apiKey && clientId)) {
  throw new Error("WORKOS_API_KEY and WORKOS_CLIENT_ID must be set");
}
if (!apiKey.startsWith("sk_test")) {
  throw new Error("Refusing to run against a non-test WorkOS API key");
}

const workos = new WorkOS(apiKey, { clientId });

async function ensureWorkOSUser() {
  const existing = await workos.userManagement.listUsers({ email: EMAIL });
  const found = existing.data[0];
  if (found) {
    await workos.userManagement.updateUser({
      userId: found.id,
      password: PASSWORD,
      emailVerified: true,
      firstName: FIRST_NAME,
      lastName: LAST_NAME,
    });
    console.log(`WorkOS user exists: ${found.id} (password reset)`);
    return found;
  }
  const created = await workos.userManagement.createUser({
    email: EMAIL,
    password: PASSWORD,
    emailVerified: true,
    firstName: FIRST_NAME,
    lastName: LAST_NAME,
  });
  console.log(`WorkOS user created: ${created.id}`);
  return created;
}

async function resetFactors(workosUserId: string) {
  const factors = await workos.multiFactorAuth.listUserAuthFactors({
    userId: workosUserId,
  });
  for (const factor of factors.data) {
    await workos.multiFactorAuth.deleteFactor(factor.id);
    console.log(`Removed ${factor.type} factor ${factor.id}`);
  }
  if (factors.data.length === 0) {
    console.log("No MFA factors to remove");
  }
}

async function ensureLocalUser(workosUserId: string) {
  const byWorkosId = await db.query.users.findFirst({
    where: eq(users.workosUserId, workosUserId),
  });
  if (byWorkosId) {
    return byWorkosId;
  }
  const byEmail = await db.query.users.findFirst({
    where: eq(users.email, EMAIL),
  });
  if (byEmail) {
    const [linked] = await db
      .update(users)
      .set({ workosUserId, emailVerified: true })
      .where(eq(users.id, byEmail.id))
      .returning();
    console.log(`Linked local user ${byEmail.id} to WorkOS`);
    return linked ?? byEmail;
  }
  const [created] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      name: `${FIRST_NAME} ${LAST_NAME}`,
      email: EMAIL,
      emailVerified: true,
      workosUserId,
    })
    .returning();
  if (!created) {
    throw new Error("Failed to insert local user");
  }
  console.log(`Local user created: ${created.id}`);
  return created;
}

async function ensureOrganization(userId: string) {
  let organization = await db.query.organizations.findFirst({
    where: eq(organizations.slug, ORG_SLUG),
  });
  if (!organization) {
    const [created] = await db
      .insert(organizations)
      .values({
        id: crypto.randomUUID(),
        name: ORG_NAME,
        slug: ORG_SLUG,
        createdAt: new Date(),
        onboardingCompleted: true,
        onboardingDismissed: true,
        onboardingAgentRan: true,
      })
      .returning();
    organization = created;
    console.log(`Organization created: ${ORG_SLUG}`);
  }
  if (!organization) {
    throw new Error("Failed to create organization");
  }
  const membership = await db.query.members.findFirst({
    where: and(
      eq(members.organizationId, organization.id),
      eq(members.userId, userId)
    ),
  });
  if (!membership) {
    await db.insert(members).values({
      id: crypto.randomUUID(),
      organizationId: organization.id,
      userId,
      role: "owner",
      createdAt: new Date(),
    });
    console.log("Owner membership created");
  }
  return organization;
}

const workosUser = await ensureWorkOSUser();
if (RESET_MFA) {
  await resetFactors(workosUser.id);
}
const localUser = await ensureLocalUser(workosUser.id);
if (workosUser.externalId !== localUser.id) {
  await workos.userManagement.updateUser({
    userId: workosUser.id,
    externalId: localUser.id,
  });
}
const organization = await ensureOrganization(localUser.id);

console.log("\nDev auth account ready");
console.log(`  Email:    ${EMAIL}`);
console.log(`  Password: ${PASSWORD}`);
console.log(`  Org:      /${organization.slug}`);
console.log(
  "\nTest: sign in at /login, open Settings → Security, set up the authenticator, sign out, sign in again."
);
process.exit(0);
