export interface DevPasskey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface DevAccount {
  email: string;
  password: string;
  totpSecret: string | null;
  totpEnrolledAt: string | null;
  passkeys: DevPasskey[];
}

export interface DevSession {
  email: string;
  method: "password" | "passkey";
  secondFactor: "totp" | null;
  signedInAt: string;
}

export interface DevPendingAuth {
  token: string;
  challengeId: string;
  kind: "mfa" | "enrollment";
  enrollmentSecret: string | null;
}

export interface DevEmailMessage {
  id: string;
  code: string;
  purpose: string;
  sentAt: string;
}

export interface DevLogEntry {
  id: string;
  at: string;
  message: string;
}

export interface DevSettingsEnrollment {
  secret: string;
  qrCode: string;
  otpauthUri?: string;
}

export interface DevElevatedAccess {
  challengeId: string | null;
  code: string | null;
  grantedUntil: number | null;
}

export type AuthFlowTab = "sign-in" | "settings";
