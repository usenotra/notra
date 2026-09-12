import type { LoginFormProps as SharedLoginFormProps } from "@notra/ui/lib/auth-types";

/** The app wires the server actions and validators; pages pass the rest. */
export type LoginFormProps = Omit<
  SharedLoginFormProps,
  | "callbackPath"
  | "validators"
  | "signInWithPassword"
  | "verifyEmailCode"
  | "verifyMfaCode"
  | "redeemBackupCode"
  | "startSocialSignIn"
  | "startPasskeySignIn"
>;
