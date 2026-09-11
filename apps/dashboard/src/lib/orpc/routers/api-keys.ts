import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  createApiKeySchema,
  deleteKeyInputSchema,
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

async function listOrganizationKeys(
  client: NonNullable<typeof unkey>,
  apiId: string,
  organizationId: string
) {
  const result = (await client.apis.listKeys({
    apiId,
    externalId: organizationId,
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

async function findOrganizationKey(
  client: NonNullable<typeof unkey>,
  apiId: string,
  organizationId: string,
  keyId: string
) {
  const keys = await listOrganizationKeys(client, apiId, organizationId);
  return keys.find((key) => key.keyId === keyId) ?? null;
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
      const keysData = await listOrganizationKeys(
        client,
        apiId,
        input.organizationId
      );

      return keysData.map((key) => {
        const meta = key.meta ?? {};
        const permissions = Array.isArray(key.permissions)
          ? key.permissions.filter(
              (permission): permission is string =>
                typeof permission === "string"
            )
          : [];

        const scopes = expandLegacyApiKeyScopes(permissions);
        const accessMode = getApiKeyAccessMode(permissions, meta.accessMode);

        return {
          accessMode,
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
      });
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

      const key = await findOrganizationKey(
        client,
        apiId,
        input.organizationId,
        input.payload.keyId
      );

      if (!key) {
        throw notFound("API key not found");
      }

      const meta =
        key.meta && typeof key.meta === "object"
          ? (key.meta as Record<string, unknown>)
          : {};

      const currentExpiration = inferExpirationOption(
        key.createdAt,
        key.expires ?? null
      );

      let expires: number | null;
      if (input.payload.expiration === currentExpiration) {
        expires = key.expires ?? null;
      } else if (input.payload.expiration === "never") {
        expires = null;
      } else {
        expires =
          Date.now() + (API_KEY_EXPIRATION_MS[input.payload.expiration] ?? 0);
      }

      const currentPermissions = Array.isArray(key.permissions)
        ? key.permissions.filter(
            (permission): permission is string => typeof permission === "string"
          )
        : [];
      const accessMode =
        input.payload.accessMode ??
        getApiKeyAccessMode(currentPermissions, meta.accessMode);
      const unknownPermissions =
        getUnknownApiKeyPermissions(currentPermissions);
      const permissions = [
        ...getApiKeyPermissionsForAccessMode(accessMode, input.payload.scopes),
        ...unknownPermissions,
      ];
      const scopes = expandLegacyApiKeyScopes(permissions);

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
          expiration_changed: input.payload.expiration !== currentExpiration,
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

      const key = await findOrganizationKey(
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
};
