export interface WorkOSAuthenticationFactorRef {
  id: string;
  type: string;
}

export interface WorkOSErrorInfo {
  code: string | null;
  message: string;
  email: string | null;
  pendingAuthenticationToken: string | null;
  organizationIds: string[];
  authenticationFactors: WorkOSAuthenticationFactorRef[];
  userId: string | null;
}
