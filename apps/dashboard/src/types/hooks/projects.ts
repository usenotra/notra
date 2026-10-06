export interface ActiveProjectState {
  /** Project the Studio views are scoped to; null when the organization has none. */
  projectId: string | null;
  /** False until the project list resolves successfully, so consumers fail closed. */
  isResolved: boolean;
  isError: boolean;
}
