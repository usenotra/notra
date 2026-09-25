import { LoginForm } from "@/components/auth/login-form";

export default function TwoFactorPreviewPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md">
        <LoginForm
          initialPending={{
            status: "mfa-required",
            pendingAuthenticationToken: "preview",
            authenticationChallengeId: "preview",
            email: "preview@example.com",
          }}
        />
      </div>
    </main>
  );
}
