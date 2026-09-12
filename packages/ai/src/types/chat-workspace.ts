export interface ChatWorkspaceOrganization {
  id: string;
  name: string;
  slug: string;
}

export interface ChatWorkspaceProject {
  id: string;
  name: string;
}

export interface ChatWorkspace {
  organization: ChatWorkspaceOrganization;
  project: ChatWorkspaceProject | null;
}

export interface LoadChatWorkspaceParams {
  organizationId: string;
  projectId?: string | null;
}
