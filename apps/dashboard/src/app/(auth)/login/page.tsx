import { Suspense } from "react";

import { LoginContent } from "@/components/auth/login-content";
import { LoginFormSkeleton } from "@/components/auth/login-form-skeleton";

export const instant = false;

export default function Login() {
  return (
    <div className="mx-auto w-full max-w-md rounded-md p-6 lg:px-8 lg:py-10">
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
