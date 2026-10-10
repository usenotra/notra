import { expect, spyOn, test } from "bun:test";

import {
  evlogRequestIntegration,
  trackRequestLoggerEmit,
} from "@notra/ai/utils/evlog-request";
import {
  getOperationalContext,
  runWithOperationalContext,
} from "@notra/ai/utils/operational-context";
import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin } from "@orpc/server/plugins";
import type { WideEvent } from "evlog";
import { createTranslator } from "use-intl/core";
import { z } from "zod";

import { assertOrganizationAccessWithDeps } from "@/lib/auth/organization";
import * as i18n from "@/lib/i18n/server";
import { baseProcedure } from "@/lib/orpc/base";
import { createORPCContext } from "@/lib/orpc/context";
import type {
  AuthenticatedUser,
  OrganizationAuthDependencies,
} from "@/types/auth/organization";

import messages from "../../messages/en.json";
import { finalizeRpcRequestAttribution } from "./rpc-telemetry";

const user: AuthenticatedUser = {
  id: "user_fixture",
  name: "Fixture",
  email: "fixture@example.invalid",
  emailVerified: true,
  image: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  role: null,
  banned: false,
  banReason: null,
  banExpires: null,
  hidePersonalData: false,
  showAgentStats: false,
  locale: null,
  workosUserId: null,
  marketingOptInAt: null,
  marketingOptInEvidence: null,
  marketingOptInPolicyVersion: null,
};
const deps: OrganizationAuthDependencies = {
  getServerSession: () =>
    Promise.resolve({ session: undefined, user: undefined }),
  hasDatabaseUrl: () => true,
  findMembership: ({ organizationId }) =>
    Promise.resolve(
      organizationId === "org_denied"
        ? undefined
        : { id: "member_fixture", role: "member" }
    ),
};

test("streaming batches resolve final attribution after the last authorized procedure", async () => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const procedure = baseProcedure
    .input(z.object({ organizationId: z.string() }))
    .handler(async ({ input, context }) => {
      if (input.organizationId === "org_b") {
        await gate;
      }
      await assertOrganizationAccessWithDeps(
        {
          headers: context.headers,
          organizationId: input.organizationId,
          user,
        },
        deps
      );
      return { ...getOperationalContext() };
    });
  const handler = new RPCHandler(
    { fast: procedure, slow: procedure },
    { plugins: [new BatchHandlerPlugin()] }
  );
  const request = new Request("https://fixture.invalid/rpc/batch", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-orpc-batch": "streaming",
    },
    body: JSON.stringify(
      ["org_a", "org_b"].map((organizationId, index) => ({
        url: `https://fixture.invalid/rpc/${index === 0 ? "fast" : "slow"}`,
        body: { json: { organizationId } },
      }))
    ),
  });
  const context = await createORPCContext({ headers: request.headers });
  const events: WideEvent[] = [];
  const handle = evlogRequestIntegration.start(request, {
    drain: ({ event }) => {
      events.push(event);
    },
  });
  trackRequestLoggerEmit(handle.logger);
  try {
    await handle.runWith(() =>
      runWithOperationalContext(
        { requestId: "req_fixture", organizationId: "org_ui" },
        async () => {
          handle.logger.set({ organizationId: "org_old", userId: "user_old" });
          const { response } = await handler.handle(request, {
            context,
            prefix: "/rpc",
          });
          if (!response) {
            throw new Error("Missing batch response");
          }
          finalizeRpcRequestAttribution(context.requestMemo);
          const wrapped = await handle.finishResponse(response, {
            status: response.status,
          });
          expect([...context.requestMemo.authorizedOrganizationIds]).toEqual([
            "org_a",
          ]);
          const reader = wrapped.body?.getReader();
          if (!reader) {
            throw new Error("Missing batch stream");
          }
          const first = await reader.read();
          expect(first.done).toBe(false);
          expect(events).toHaveLength(0);
          release();
          while (!(await reader.read()).done) {
            /* consume the remaining response */
          }
          expect(getOperationalContext()?.organizationId).toBe("org_ui");
        }
      )
    );
    expect([...context.requestMemo.authorizedOrganizationIds]).toEqual([
      "org_a",
      "org_b",
    ]);
    expect(events).toHaveLength(1);
    expect(events[0]?.organizationId).toBeUndefined();
    expect(events[0]?.userId).toBe(user.id);
  } finally {
    release();
  }
});

test("only verified non-RPC membership acquires operational attribution", async () => {
  const translations = spyOn(i18n, "getTranslations").mockImplementation(
    async (namespace) => createTranslator({ locale: "en", messages, namespace })
  );
  try {
    await runWithOperationalContext({ requestId: "req_fixture" }, async () => {
      const headers = new Headers();
      await expect(
        assertOrganizationAccessWithDeps(
          { headers, organizationId: "org_denied", user },
          deps
        )
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(getOperationalContext()?.organizationId).toBeUndefined();
      expect(getOperationalContext()?.userId).toBeUndefined();
      await assertOrganizationAccessWithDeps(
        { headers, organizationId: "org_target", user },
        deps
      );
      expect(getOperationalContext()).toMatchObject({
        organizationId: "org_target",
        userId: user.id,
      });
    });
    expect(getOperationalContext()).toBeUndefined();
  } finally {
    translations.mockRestore();
  }
});
