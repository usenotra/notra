import type { LoginFormProps as SharedLoginFormProps } from "@notra/ui/lib/auth-types";

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
