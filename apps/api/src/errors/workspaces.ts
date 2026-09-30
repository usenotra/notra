export class WorkspaceInvitationServiceError extends Error {
  override readonly name = "WorkspaceInvitationServiceError";

  constructor(cause: unknown) {
    super("Workspace invitation service unavailable", { cause });
  }
}
