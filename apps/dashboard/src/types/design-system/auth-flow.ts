export interface DevAccount {
  email: string;
  password: string;
  totpSecret: string | null;
  totpEnrolledAt: string | null;
}

export interface DevSession {
  email: string;
  secondFactor: "totp" | null;
  signedInAt: string;
}

export interface DevPendingAuth {
  token: string;
  challengeId: string;
  kind: "mfa" | "enrollment";
  enrollmentSecret: string | null;
}

export interface DevLogEntry {
  id: string;
  at: string;
  message: string;
}

export interface DevSettingsEnrollment {
  secret: string;
  qrCode: string;
  otpauthUri: string;
}

export type AuthFlowTab = "sign-in" | "settings";

export interface AuthenticatorWidgetProps {
  secret: string | null;
}

export interface SimulatorPanelProps {
  account: DevAccount;
  backupCodeCount: number;
  orgRequiresMfa: boolean;
  session: DevSession | null;
  pending: DevPendingAuth | null;
  settingsEnrollmentSecret: string | null;
  log: DevLogEntry[];
  onToggleOrgRequiresMfa: (value: boolean) => void;
  onReset: () => void;
}

export interface SignedInViewProps {
  session: DevSession;
  onSignOut: () => void;
  onOpenSettings: () => void;
}
