export type PreviewGateError =
  | "wrong_password"
  | "too_many_attempts"
  | "forbidden"
  | "invalid_link";

export interface PreviewGatePage {
  signInUrl: string;
  passwordEnabled: boolean;
  next: string;
  error: PreviewGateError | null;
}

export interface SystemPageContent {
  title: string;
  body: string;
}
