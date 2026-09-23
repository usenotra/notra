import type { LoginFormProps as SharedLoginFormProps } from "@notra/ui/types/auth";

export type LoginFormProps = Omit<
  SharedLoginFormProps,
  | "callbackPath"
  | "validators"
  | "signInWithPassword"
  | "verifyEmailCode"
  | "verifyMfaCode"
  | "redeemBackupCode"
  | "startSocialSignIn"
>;
