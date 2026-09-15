/** Server-side record of the sign-in attempt that is currently mid-MFA. */
export interface MfaAttempt {
  workosUserId: string;
  authenticationChallengeId: string;
}

/** Pending WorkOS credentials handed from the social callback to /login. */
export interface PendingMfaChallenge {
  pendingAuthenticationToken: string;
  authenticationChallengeId: string;
  email: string;
}
