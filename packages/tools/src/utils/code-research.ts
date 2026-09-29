import { CODE_RESEARCH_SESSION_ATTRIBUTE } from "@notra/ai/constants/code-research";
import type { CodeResearchScope } from "@notra/ai/utils/code-research-actions";
import { isCodeResearchConfigured } from "@notra/ai/utils/code-research-box";
import type { SessionContext } from "eve/context";

import { requireOrganizationId } from "./organization";
import { getBooleanSessionAttribute } from "./session";

export function isCodeResearchEnabled(ctx: SessionContext): boolean {
  if (!isCodeResearchConfigured()) {
    return false;
  }
  return (
    process.env.NODE_ENV === "development" ||
    getBooleanSessionAttribute(ctx, CODE_RESEARCH_SESSION_ATTRIBUTE)
  );
}

/**
 * Subagents run in child sessions, so boxes are keyed by the root chat
 * session and every call in one chat shares them.
 */
export function getCodeResearchScope(ctx: SessionContext): CodeResearchScope {
  if (!isCodeResearchEnabled(ctx)) {
    throw new Error(
      "Code research is not enabled for this organization. Finish with status unavailable."
    );
  }
  return {
    sessionKey: ctx.session.parent?.rootSessionId ?? ctx.session.id,
    organizationId: requireOrganizationId(ctx),
  };
}
