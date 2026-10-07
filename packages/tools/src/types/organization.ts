import type { SessionContext } from "eve/context";

export interface OrganizationContext {
  readonly session: {
    readonly auth: SessionContext["session"]["auth"];
  };
}
