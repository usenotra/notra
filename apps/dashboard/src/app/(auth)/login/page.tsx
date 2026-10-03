import { Suspense } from "react";

import { LoginContent } from "@/components/auth/login-content";
import { LoginFormSkeleton } from "@/components/auth/login-form-skeleton";
import type { LoginPageProps } from "@/types/auth/login-page";

export const instant = false;

export default function Login({ searchParams }: LoginPageProps) {
  return (
    <div className="mx-auto w-full max-w-md rounded-md p-6 lg:px-8 lg:py-10">
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
