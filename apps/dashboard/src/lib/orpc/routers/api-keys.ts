import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  createApiKeySchema,
  deleteAccountKeyInputSchema,
  deleteKeyInputSchema,
  updateAccountKeyInputSchema,
  updateKeyInputSchema,
} from "@notra/schemas/dashboard/api-keys";
import { organizationIdInputSchema } from "@notra/schemas/dashboard/auth/organization";
import type {
  KeyResponseData,
  V2ApisListKeysResponseBody,
} from "@unkey/api/models/components";

import { API_KEY_EXPIRATION_MS } from "@/constants/api-keys";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import {
  expandLegacyApiKeyScopes,
  getApiKeyAccessMode,
  getApiKeyPermissionsForAccessMode,
  getUnknownApiKeyPermissions,
  summarizeApiKeyScopes,
} from "@/lib/api-keys/scopes";
import { unkey } from "@/lib/api-keys/unkey";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { assertActiveSubscription } from "@/lib/billing/subscription";
import { authorizedProcedure } from "@/lib/orpc/base";

import {
  badRequest,
  internalServerError,
  notFound,
  serviceUnavailable,
} from "../utils/errors";

function inferExpirationOption(createdAt: number, expires: number | null) {
  if (expires === null) {
    return "never" as const;
  }

  const ttl = Math.max(0, expires - createdAt);
  const day = 24 * 60 * 60 * 1000;

  if (ttl <= 7 * day) {
    return "7d" as const;
  }

  if (ttl <= 30 * day) {
    return "30d" as const;
  }

  if (ttl <= 60 * day) {
    return "60d" as const;
  }

  return "90d" as const;
}

function requireUnkeyConfig() {
  if (!unkey) {
    throw serviceUnavailable("API key service is not configured");
  }

  const apiId = process.env.UNKEY_API_ID;
  if (!apiId) {
    throw serviceUnavailable("API key service is not configured");
  }

  return {
    apiId,
    client: unkey,
  };
}

type ListKeysResult =
  | V2ApisListKeysResponseBody
  | AsyncIterable<{ result: V2ApisListKeysResponseBody }>;

function isListKeysResponseBody(
  result: ListKeysResult
): result is V2ApisListKeysResponseBody {
  return "data" in result && Array.isArray(result.data);
}

async function listKeysByExternalId(
  client: NonNullable<typeof unkey>,
  apiId: string,
  externalId: string
) {
  const result = (await client.apis.listKeys({
    apiId,
    externalId,
  })) as ListKeysResult;

  if (isListKeysResponseBody(result)) {
    return result.data;
  }

  const keys: KeyResponseData[] = [];
  for await (const page of result) {
    keys.push(...page.result.data);
  }

  return keys;
}

async function findKeyByExternalId(
  client: NonNullable<typeof unkey>,
  apiId: string,
  externalId: string,
  keyId: string
) {
  const keys = await listKeysByExternalId(client, apiId, externalId);
  return keys.find((key) => key.keyId === keyId) ?? null;
}

// `user:<userId>` mirrors apps/api `ACCOUNT_KEY_EXTERNAL_ID_PREFIX`. Org keys
// keep the bare organization id as externalId and are unaffected.
function toAccountExternalId(userId: string): string {
  return `user:${userId}`;
}

function toKeyListItem(key: KeyResponseData) {
  const meta = key.meta ?? {};
  const permissions = Array.isArray(key.permissions)
    ? key.permissions.filter(
        (permission): permission is string => typeof permission === "string"
      )
    : [];

  const scopes = expandLegacyApiKeyScopes(permissions);
  const accessMode = getApiKeyAccessMode(permissions, meta.accessMode);

  return {
    accessMode,
    accountWide: meta.accountWide === true,
    createdAt: key.createdAt,
    createdBy: meta.createdBy ?? null,
    enabled: key.enabled,
    expires: key.expires ?? null,
    keyId: key.keyId,
    name: key.name ?? "Unnamed",
    permission: summarizeApiKeyScopes(scopes),
    permissions,
    start: key.start,
  };
}

function resolveUpdatePayload(
  key: KeyResponseData,
  payload: {
    accessMode?: string;
    scopes: readonly string[];
    expiration: string;
  }
) {
  const meta =
    key.meta && typeof key.meta === "object"
      ? (key.meta as Record<string, unknown>)
      : {};

  const currentExpiration = inferExpirationOption(
    key.createdAt,
    key.expires ?? null
  );

  let expires: number | null;
  if (payload.expiration === currentExpiration) {
    expires = key.expires ?? null;
  } else if (payload.expiration === "never") {
    expires = null;
  } else {
    expires =
      Date.now() +
      (API_KEY_EXPIRATION_MS[
        payload.expiration as keyof typeof API_KEY_EXPIRATION_MS
      ] ?? 0);
  }

  const currentPermissions = Array.isArray(key.permissions)
    ? key.permissions.filter(
        (permission): permission is string => typeof permission === "string"
      )
    : [];
  const accessMode =
    payload.accessMode ??
    getApiKeyAccessMode(currentPermissions, meta.accessMode);
  const unknownPermissions = getUnknownApiKeyPermissions(currentPermissions);
  const permissions = [
    ...getApiKeyPermissionsForAccessMode(
      accessMode as Parameters<typeof getApiKeyPermissionsForAccessMode>[0],
      payload.scopes
    ),
    ...unknownPermissions,
  ];
  const scopes = expandLegacyApiKeyScopes(permissions);

  return { accessMode, expires, meta, permissions, scopes };
}

export const apiKeysRouter = {
  list: authorizedProcedure
    .input(organizationIdInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const { apiId, client } = requireUnkeyConfig();
      const keysData = await listKeysByExternalId(
        client,
        apiId,
        input.organizationId
      );

      return keysData.map(toKeyListItem);
    }),
  create: authorizedProcedure
    .input(organizationIdInputSchema.extend(createApiKeySchema.shape))
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });
      await assertActiveSubscription(input.organizationId);

      const { apiId, client } = requireUnkeyConfig();
      const expiresMs = API_KEY_EXPIRATION_MS[input.expiration];
      const expires = expiresMs ? Date.now() + expiresMs : undefined;
      const permissions = getApiKeyPermissionsForAccessMode(
        input.accessMode,
        input.scopes
      );
      const scopes = expandLegacyApiKeyScopes(permissions);

      const created = await client.keys.createKey({
        apiId,
        expires,
        externalId: input.organizationId,
        meta: {
          accessMode: input.accessMode,
          createdBy: context.user.name,
        },
        name: input.name,
        permissions,
        prefix: "ntra",
      });

      const fullKey = created.data?.key;
      const keyId = created.data?.keyId;

      if (!(fullKey && keyId)) {
        throw internalServerError("Failed to create API key");
      }

      trackServerEvent({
        event: POSTHOG_EVENTS.API_KEY_CREATED,
        headers: context.headers,
        userId: context.user.id,
        organizationId: input.organizationId,
        properties: {
          key_id: keyId,
          permission_preset: summarizeApiKeyScopes(scopes),
          scope_count: scopes.length,
          expiration: input.expiration,
        },
      });

      return {
        key: fullKey,
        keyId,
        name: input.name,
      };
    }),
  update: authorizedProcedure
    .input(updateKeyInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });
      await assertActiveSubscription(input.organizationId);

      const { apiId, client } = requireUnkeyConfig();

      if (input.payload.keyId !== input.keyIdParam) {
        throw badRequest("Key ID mismatch");
      }

      const key = await findKeyByExternalId(
        client,
        apiId,
        input.organizationId,
        input.payload.keyId
      );

      if (!key) {
        throw notFound("API key not found");
      }

      const { accessMode, expires, meta, permissions, scopes } =
        resolveUpdatePayload(key, {
          accessMode: input.payload.accessMode,
          expiration: input.payload.expiration,
          scopes: input.payload.scopes,
        });

      await client.keys.updateKey({
        expires,
        keyId: input.payload.keyId,
        meta: {
          ...meta,
          accessMode,
        },
        name: input.payload.name,
        permissions,
      });

      trackServerEvent({
        event: POSTHOG_EVENTS.API_KEY_UPDATED,
        headers: context.headers,
        userId: context.user.id,
        organizationId: input.organizationId,
        properties: {
          key_id: input.payload.keyId,
          permission_preset: summarizeApiKeyScopes(scopes),
          scope_count: scopes.length,
          expiration: input.payload.expiration,
          expiration_changed:
            input.payload.expiration !==
            inferExpirationOption(key.createdAt, key.expires ?? null),
        },
      });

      return { success: true };
    }),
  delete: authorizedProcedure
    .input(deleteKeyInputSchema)
    .handler(async ({ context, input }) => {
      await assertOrganizationAccess({
        headers: context.headers,
        organizationId: input.organizationId,
        user: context.user,
      });

      const { apiId, client } = requireUnkeyConfig();

      if (input.payload.keyId !== input.keyIdParam) {
        throw badRequest("Key ID mismatch");
      }

      const key = await findKeyByExternalId(
        client,
        apiId,
        input.organizationId,
        input.payload.keyId
      );

      if (!key) {
        throw notFound("API key not found");
      }

      await client.keys.deleteKey({ keyId: input.payload.keyId });

      trackServerEvent({
        event: POSTHOG_EVENTS.API_KEY_DELETED,
        headers: context.headers,
        userId: context.user.id,
        organizationId: input.organizationId,
        properties: {
          key_id: input.payload.keyId,
        },
      });

      return { success: true };
    }),
  account: {
    list: authorizedProcedure.handler(async ({ context }) => {
      const { apiId, client } = requireUnkeyConfig();
      const keysData = await listKeysByExternalId(
        client,
        apiId,
        toAccountExternalId(context.user.id)
      );

      return keysData.map(toKeyListItem);
    }),
    create: authorizedProcedure
      .input(createApiKeySchema)
      .handler(async ({ context, input }) => {
        // Intentionally no assertActiveSubscription: account keys are personal
        // credentials, not org-billed. Entitlements are enforced per request
        // when the key acts in an org.
        const { apiId, client } = requireUnkeyConfig();
        const expiresMs = API_KEY_EXPIRATION_MS[input.expiration];
        const expires = expiresMs ? Date.now() + expiresMs : undefined;
        const permissions = getApiKeyPermissionsForAccessMode(
          input.accessMode,
          input.scopes
        );
        const scopes = expandLegacyApiKeyScopes(permissions);

        const created = await client.keys.createKey({
          apiId,
          expires,
          externalId: toAccountExternalId(context.user.id),
          meta: {
            accessMode: input.accessMode,
            accountWide: true,
            createdBy: context.user.name,
          },
          name: input.name,
          permissions,
          prefix: "ntra",
        });

        const fullKey = created.data?.key;
        const keyId = created.data?.keyId;

        if (!(fullKey && keyId)) {
          throw internalServerError("Failed to create API key");
        }

        trackServerEvent({
          event: POSTHOG_EVENTS.API_KEY_CREATED,
          headers: context.headers,
          userId: context.user.id,
          properties: {
            key_id: keyId,
            permission_preset: summarizeApiKeyScopes(scopes),
            scope_count: scopes.length,
            expiration: input.expiration,
            account_wide: true,
          },
        });

        return {
          key: fullKey,
          keyId,
          name: input.name,
        };
      }),
    update: authorizedProcedure
      .input(updateAccountKeyInputSchema)
      .handler(async ({ context, input }) => {
        // Mirrors account.create: no subscription gate (see above).
        const { apiId, client } = requireUnkeyConfig();

        if (input.payload.keyId !== input.keyIdParam) {
          throw badRequest("Key ID mismatch");
        }

        const key = await findKeyByExternalId(
          client,
          apiId,
          toAccountExternalId(context.user.id),
          input.payload.keyId
        );

        if (!key) {
          throw notFound("API key not found");
        }

        const { accessMode, expires, meta, permissions, scopes } =
          resolveUpdatePayload(key, {
            accessMode: input.payload.accessMode,
            expiration: input.payload.expiration,
            scopes: input.payload.scopes,
          });

        await client.keys.updateKey({
          expires,
          keyId: input.payload.keyId,
          meta: {
            ...meta,
            accountWide: true,
            accessMode,
          },
          name: input.payload.name,
          permissions,
        });

        trackServerEvent({
          event: POSTHOG_EVENTS.API_KEY_UPDATED,
          headers: context.headers,
          userId: context.user.id,
          properties: {
            key_id: input.payload.keyId,
            permission_preset: summarizeApiKeyScopes(scopes),
            scope_count: scopes.length,
            expiration: input.payload.expiration,
            expiration_changed:
              input.payload.expiration !==
              inferExpirationOption(key.createdAt, key.expires ?? null),
            account_wide: true,
          },
        });

        return { success: true };
      }),
    delete: authorizedProcedure
      .input(deleteAccountKeyInputSchema)
      .handler(async ({ context, input }) => {
        const { apiId, client } = requireUnkeyConfig();

        if (input.payload.keyId !== input.keyIdParam) {
          throw badRequest("Key ID mismatch");
        }

        const key = await findKeyByExternalId(
          client,
          apiId,
          toAccountExternalId(context.user.id),
          input.payload.keyId
        );

        if (!key) {
          throw notFound("API key not found");
        }

        await client.keys.deleteKey({ keyId: input.payload.keyId });

        trackServerEvent({
          event: POSTHOG_EVENTS.API_KEY_DELETED,
          headers: context.headers,
          userId: context.user.id,
          properties: {
            key_id: input.payload.keyId,
            account_wide: true,
          },
        });

        return { success: true };
      }),
  },
};
