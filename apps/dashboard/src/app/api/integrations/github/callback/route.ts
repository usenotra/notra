import {
  GitHubAccountRequiredError,
  GitHubInstallationAccessDeniedError,
  GitHubReauthorizationRequiredError,
  upsertGitHubAppInstallation,
} from "@notra/ai/integrations/github";
import { redis } from "@notra/ai/utils/redis";
import { buildCallbackUrl } from "@notra/utils/callback-url";
import { ORPCError } from "@orpc/server";
import { type NextRequest, NextResponse } from "next/server";

import {
  INTEGRATION_AUTH_KINDS,
  INTEGRATION_PROVIDERS,
} from "@/constants/integration-analytics";
import { assertOrganizationAccess } from "@/lib/auth/organization";
import { getServerSession } from "@/lib/auth/session";
import {
  trackIntegrationConnected,
  trackIntegrationConnectFailed,
} from "@/lib/integrations/connect-events";
import { getLastVisitedOrganization } from "@/utils/cookies";
import { ratelimit } from "@/utils/ratelimit";

interface GitHubAppInstallState {
  organizationId: string;
  userId: string;
  callbackPath: string;
}

const ORGANIZATION_SLUG_PATTERN = /^[a-z0-9-]+$/i;

function getFallbackCallbackPath(request: NextRequest) {
  const slug = getLastVisitedOrganization(request.cookies);
  if (!slug || !ORGANIZATION_SLUG_PATTERN.test(slug)) {
    return null;
  }
  return `/${slug}/integrations/github`;
}

function buildErrorRedirect(params: {
  request: NextRequest;
  baseUrl: string;
  callbackPath: string | null;
  code: string;
}) {
  trackIntegrationConnectFailed({
    headers: params.request.headers,
    provider: INTEGRATION_PROVIDERS.GITHUB,
    authKind: INTEGRATION_AUTH_KINDS.OAUTH,
    errorCode: params.code,
  });

  if (params.callbackPath) {
    return NextResponse.redirect(
      buildCallbackUrl(params.baseUrl, params.callbackPath, {
        githubError: params.code,
      })
    );
  }

  return NextResponse.redirect(
    `${params.baseUrl}/?error=${encodeURIComponent(params.code)}`
  );
}

async function readInstallState(state: string | null) {
  if (!(state && redis)) {
    return null;
  }

  const raw = await redis.get<string>(`github_app_install:${state}`);
  if (!raw) {
    return null;
  }

  const installState: GitHubAppInstallState =
    typeof raw === "string" ? JSON.parse(raw) : raw;
  return installState;
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  let callbackPath: string | null = null;
  let installationId: string | null = null;
  let state: string | null = null;

  try {
    const { searchParams } = new URL(request.url);
    installationId = searchParams.get("installation_id");
    state = searchParams.get("state");
    const error = searchParams.get("error");

    const installState = await readInstallState(state);
    callbackPath =
      installState?.callbackPath ?? getFallbackCallbackPath(request);

    if (error) {
      return buildErrorRedirect({
        request,
        baseUrl,
        callbackPath,
        code:
          error === "access_denied"
            ? "install_cancelled"
            : "github_callback_failed",
      });
    }

    if (!(installationId && state && redis)) {
      return buildErrorRedirect({
        request,
        baseUrl,
        callbackPath,
        code: "invalid_callback",
      });
    }

    if (!installState) {
      return buildErrorRedirect({
        request,
        baseUrl,
        callbackPath,
        code: "expired_state",
      });
    }

    const { session, user } = await getServerSession({
      headers: request.headers,
    });
    if (!session?.userId || session.userId !== installState.userId) {
      return buildErrorRedirect({
        request,
        baseUrl,
        callbackPath,
        code: "session_mismatch",
      });
    }

    const { success: withinLimit } = await ratelimit.githubAppCallback.limit(
      session.userId
    );
    if (!withinLimit) {
      return buildErrorRedirect({
        request,
        baseUrl,
        callbackPath,
        code: "too_many_requests",
      });
    }

    try {
      await assertOrganizationAccess({
        headers: request.headers,
        organizationId: installState.organizationId,
        user,
      });
    } catch (accessError) {
      if (accessError instanceof ORPCError) {
        return buildErrorRedirect({
          request,
          baseUrl,
          callbackPath,
          code: "forbidden",
        });
      }
      throw accessError;
    }

    const installation = await upsertGitHubAppInstallation({
      organizationId: installState.organizationId,
      userId: installState.userId,
      installationId,
    });

    trackIntegrationConnected({
      headers: request.headers,
      userId: installState.userId,
      organizationId: installState.organizationId,
      provider: INTEGRATION_PROVIDERS.GITHUB,
      authKind: INTEGRATION_AUTH_KINDS.OAUTH,
    });

    return NextResponse.redirect(
      buildCallbackUrl(baseUrl, installState.callbackPath, {
        githubConnected: "true",
        githubAccountId: installation.accountId,
      })
    );
  } catch (error) {
    if (
      error instanceof GitHubAccountRequiredError ||
      error instanceof GitHubReauthorizationRequiredError
    ) {
      if (callbackPath && installationId && state) {
        return NextResponse.redirect(
          buildCallbackUrl(baseUrl, callbackPath, {
            githubReauthorizeInstallationId: installationId,
            githubReauthorizeState: state,
          })
        );
      }
      return buildErrorRedirect({
        request,
        baseUrl,
        callbackPath,
        code: "github_reauthorization_required",
      });
    }
    if (error instanceof GitHubInstallationAccessDeniedError) {
      return buildErrorRedirect({
        request,
        baseUrl,
        callbackPath,
        code: "github_installation_forbidden",
      });
    }
    console.error(
      "Error in GitHub App callback:",
      error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    );
    return buildErrorRedirect({
      request,
      baseUrl,
      callbackPath,
      code: "github_callback_failed",
    });
  }
}
