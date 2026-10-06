export interface SitesWebhookResult {
  httpStatus: number;
  body: Record<string, unknown>;
  jobIds: string[];
}

export interface SitesWebhookParams {
  event: string;
  deliveryId: string | null;
  signature: string | null;
  rawBody: string;
  secret: string;
}

export interface RepositoryPayload {
  id: number;
  full_name: string;
}

export interface PushPayload {
  ref: string;
  after: string;
  deleted?: boolean;
  repository: RepositoryPayload;
  installation?: { id: number };
  head_commit?: { message?: string; author?: { name?: string } } | null;
}

export interface PullRequestPayload {
  action: string;
  number: number;
  repository: RepositoryPayload;
  installation?: { id: number };
  pull_request: {
    head: { sha: string; ref: string; repo: { id: number } | null };
    base: { ref: string };
    title: string;
    user?: { login?: string };
    draft?: boolean;
  };
}

export interface CheckRunPayload {
  action: string;
  installation?: { id: number };
  repository: RepositoryPayload;
  check_run: { external_id: string | null; head_sha: string };
}
