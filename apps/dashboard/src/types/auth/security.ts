import type {
  PasskeySummary,
  TotpFactorSummary,
} from "@notra/ui/lib/security-types";
import type * as z from "zod";

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

export interface WidgetsRequestOptions<Schema extends z.ZodType> {
  accessToken: string;
  elevatedAccessToken?: string;
  path: string;
  method: "GET" | "POST" | "DELETE";
  body?: unknown;
  schema: Schema;
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
