import type { SignOutActionOptions } from "@/types/auth/user-actions";

export interface SignOutOptions extends SignOutActionOptions {
  fetchOptions?: {
    onSuccess?: () => void;
  };
}
