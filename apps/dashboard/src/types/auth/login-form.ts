import type { LoginFormProps as SharedLoginFormProps } from "@notra/ui/types/auth";

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
>;
