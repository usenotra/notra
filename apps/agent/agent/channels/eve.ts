import {
  AGENT_AUTO_PUBLISH_HEADER,
  AGENT_BRAND_AGENT_TYPE_HEADER,
  AGENT_CHAT_HEADER,
  AGENT_COLLECTION_HEADER,
  AGENT_CONTENT_HEADER,
  AGENT_CONTENT_TYPE_HEADER,
  AGENT_GENERATION_CONFIG_HEADER,
  AGENT_ORGANIZATION_HEADER,
  AGENT_SERVICE_USERNAME,
  AGENT_SOURCE_METADATA_HEADER,
  AGENT_SURFACE_HEADER,
  AGENT_CHARGE_AI_CREDITS_HEADER,
  AGENT_CODE_RESEARCH_HEADER,
  AGENT_USE_MARKUP_HEADER,
  AGENT_USER_HEADER,
  AGENT_VOICE_HEADER,
} from "@notra/ai/constants/agent";
import { CODE_RESEARCH_SESSION_ATTRIBUTE } from "@notra/ai/constants/code-research";
import {
  type AuthFn,
  extractBearerToken,
  localDev,
  type VercelSubjectEnvironment,
  vercelOidc,
  vercelSubject,
  verifyHttpBasic,
  verifyVercelOidc,
} from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";

import { ALLOWED_VERCEL_ENVIRONMENTS } from "../lib/constants/auth";
import type { VerifiedSessionAuth } from "../lib/types/auth";

const ATTRIBUTE_HEADERS: readonly [string, string][] = [
  [AGENT_ORGANIZATION_HEADER, "organizationId"],
  [AGENT_USER_HEADER, "userId"],
  [AGENT_CHAT_HEADER, "chatId"],
  [AGENT_SURFACE_HEADER, "surface"],
  [AGENT_CONTENT_HEADER, "contentId"],
  [AGENT_COLLECTION_HEADER, "collectionId"],
  [AGENT_CONTENT_TYPE_HEADER, "contentType"],
  [AGENT_AUTO_PUBLISH_HEADER, "autoPublish"],
  [AGENT_USE_MARKUP_HEADER, "useMarkup"],
  [AGENT_CHARGE_AI_CREDITS_HEADER, "chargeAiCredits"],
  [AGENT_VOICE_HEADER, "voiceId"],
  [AGENT_BRAND_AGENT_TYPE_HEADER, "brandAgentType"],
  [AGENT_SOURCE_METADATA_HEADER, "sourceMetadata"],
  [AGENT_GENERATION_CONFIG_HEADER, "generationConfig"],
  [AGENT_CODE_RESEARCH_HEADER, CODE_RESEARCH_SESSION_ATTRIBUTE],
];

function getDashboardEnvironment(): VercelSubjectEnvironment {
  const configured = process.env.DASHBOARD_VERCEL_ENVIRONMENT;
  const match = ALLOWED_VERCEL_ENVIRONMENTS.find(
    (value) => value === configured
  );
  return match ?? "production";
}

function withNotraAttributes(
  sessionAuth: VerifiedSessionAuth,
  request: Request
): VerifiedSessionAuth {
  const attributes: Record<string, string> = {};
  for (const [header, attribute] of ATTRIBUTE_HEADERS) {
    const value = request.headers.get(header);
    if (value) {
      attributes[attribute] = value;
    }
  }
  if (Object.keys(attributes).length === 0) {
    return sessionAuth;
  }
  return {
    ...sessionAuth,
    attributes: {
      ...sessionAuth.attributes,
      ...attributes,
    },
  };
}

function trustedProjectOidcAuth(
  getProjectName: () => string | undefined
): AuthFn<Request> {
  return async (request) => {
    const teamSlug = process.env.DASHBOARD_VERCEL_TEAM_SLUG;
    const projectName = getProjectName();
    if (!(teamSlug && projectName)) {
      return null;
    }

    const token = extractBearerToken(request.headers.get("authorization"));
    const result = await verifyVercelOidc(token, {
      subjects: [
        vercelSubject({
          environment: getDashboardEnvironment(),
          projectName,
          teamSlug,
        }),
      ],
    });
    if (!result.ok) {
      return null;
    }

    return withNotraAttributes(result.sessionAuth, request);
  };
}

function serviceAuth(): AuthFn<Request> {
  return (request) => {
    const password = process.env.EVE_NOTRA_AGENT_PASSWORD;
    if (!password) {
      return null;
    }

    const result = verifyHttpBasic(request.headers.get("authorization"), {
      password,
      username: AGENT_SERVICE_USERNAME,
    });
    if (!result.ok) {
      return null;
    }

    return withNotraAttributes(result.sessionAuth, request);
  };
}

function localDevAttributeAuth(): AuthFn<Request> {
  const authenticate = localDev();
  return async (request) => {
    const sessionAuth = await authenticate(request);
    return sessionAuth ? withNotraAttributes(sessionAuth, request) : null;
  };
}

export default eveChannel({
  auth: [
    trustedProjectOidcAuth(() => process.env.DASHBOARD_VERCEL_PROJECT_NAME),
    trustedProjectOidcAuth(() => process.env.API_VERCEL_PROJECT_NAME),
    serviceAuth(),
    vercelOidc(),
    localDevAttributeAuth(),
  ],
});
