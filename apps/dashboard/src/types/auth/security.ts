import type {
  PasskeySummary,
  TotpFactorSummary,
} from "@notra/ui/lib/security-types";

import type { SECURITY_ERROR_CODES } from "@/constants/security";

export type SecurityErrorCode =
  (typeof SECURITY_ERROR_CODES)[keyof typeof SECURITY_ERROR_CODES];

export interface SecurityActionError {
  message: string;
  code: SecurityErrorCode;
}

export type SecurityActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: SecurityActionError };

export interface SecurityOverview {
  email: string;
  totpFactors: TotpFactorSummary[];
  backupCodesRemaining: number;
  passkeys: PasskeySummary[];
  passkeysAvailable: boolean;
}

export interface StartTotpEnrollmentResult {
  factorId: string;
  authenticationChallengeId: string;
  qrCode: string;
  secret: string;
  otpauthUri: string;
}

export interface VerifyTotpEnrollmentResult {
  verified: true;
  backupCodes: string[];
}

export interface RegenerateBackupCodesResult {
  codes: string[];
}

export interface RecoveryTokenPayload {
  workosUserId: string;
  email: string;
  exp: number;
}

export interface VerifyTotpEnrollmentInput {
  authenticationChallengeId: string;
  code: string;
}

export interface RemoveAuthFactorInput {
  factorId: string;
}

export interface SendSecurityChallengeResult {
  authenticationChallengeId: string;
}

export interface VerifySecurityChallengeInput {
  authenticationChallengeId: string;
  code: string;
}

export interface StartPasskeyRegistrationResult {
  challengeId: string;
  options: PublicKeyCredentialCreationOptionsJSON;
}

export interface CompletePasskeyRegistrationInput {
  challengeId: string;
  response: PasskeyRegistrationResponseJSON;
}

export interface RemovePasskeyInput {
  passkeyId: string;
}

export interface WidgetsRequestOptions {
  accessToken: string;
  elevatedAccessToken?: string | null;
  requiresElevatedAccess?: boolean;
  path: string;
  method: "GET" | "POST" | "DELETE";
  body?: unknown;
}

export interface WidgetsPasskeyRecord {
  id: string;
  name?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
}

export interface WidgetsAuthenticationInformationResponse {
  data?: {
    verificationMethods?: {
      Mfa?: { isSetUp: boolean; lastUsed?: string | null } | null;
      Passkey?: {
        isSetUp: boolean;
        lastUsed?: string | null;
        passKeys?: WidgetsPasskeyRecord[];
      } | null;
    };
  };
}

export interface WidgetsSendVerificationResponse {
  authenticationChallenge: string;
}

export interface WidgetsVerifyResponse {
  elevatedAccessToken: string;
  expiresAt?: string;
}

export interface WidgetsRegisterPasskeyResponse {
  challengeId: string;
  options: PublicKeyCredentialCreationOptionsJSON;
}

/** JSON form of a WebAuthn registration credential (what `credential.toJSON()` returns). */
export interface PasskeyRegistrationResponseJSON {
  id: string;
  rawId: string;
  type: "public-key";
  authenticatorAttachment?: string;
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
  response: {
    clientDataJSON: string;
    attestationObject: string;
    transports?: string[];
  };
}

/** JSON form of a WebAuthn assertion credential. */
export interface PasskeyAuthenticationResponseJSON {
  id: string;
  rawId: string;
  type: "public-key";
  authenticatorAttachment?: string;
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string | null;
  };
}

export type PasskeyCreationOutcome =
  | { ok: true; response: PasskeyRegistrationResponseJSON }
  | { ok: false; cancelled: boolean; message: string };

export type PasskeyAssertionOutcome =
  | { ok: true; response: PasskeyAuthenticationResponseJSON }
  | { ok: false; cancelled: boolean; message: string };
