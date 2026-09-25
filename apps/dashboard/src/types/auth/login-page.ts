import type { PendingAuthStep } from "@notra/schemas/types/dashboard/auth";

export interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export interface LoginPageStart {
  pending?: PendingAuthStep;
  resumeEnrollmentFlowId?: string;
}

export interface SocialEnrollmentResumeProps {
  flowId: string;
  returnTo?: string;
}
