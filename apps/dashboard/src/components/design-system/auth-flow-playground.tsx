"use client";

import { loginSchema } from "@notra/schemas/dashboard/auth/credentials";
import { LoginForm } from "@notra/ui/components/shared/auth/login-form";
import { TwoFactorSettings } from "@notra/ui/components/shared/security/two-factor-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@notra/ui/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { TitleCard } from "@notra/ui/components/ui/title-card";

import {
  SignedInView,
  SimulatorPanel,
} from "@/components/design-system/auth-flow-simulator-panel";
import { DesignSystemFrame } from "@/components/design-system/design-system-frame";
import { useAuthFlowPlayground } from "@/components/design-system/use-auth-flow-playground";
import type { AuthFlowTab } from "@/types/design-system/auth-flow";

const validators = {
  email: (value: string) =>
    loginSchema.shape.email.safeParse(value).error?.issues[0]?.message,
  password: (value: string) =>
    loginSchema.shape.password.safeParse(value).error?.issues[0]?.message,
};

export function AuthFlowPlayground() {
  const flow = useAuthFlowPlayground();

  return (
    <DesignSystemFrame
      description={
        <>
          End-to-end sign-in and two-factor flow against an in-browser stand-in
          for WorkOS. TOTP codes are real (RFC 6238). Nothing here talks to
          WorkOS or the database.
        </>
      }
      title="Auth flow playground"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Tabs
          onValueChange={(value) => flow.setTab(value as AuthFlowTab)}
          value={flow.tab}
        >
          <TabsList>
            <TabsTrigger value="sign-in">Sign in</TabsTrigger>
            <TabsTrigger disabled={!flow.session} value="settings">
              Security settings
            </TabsTrigger>
          </TabsList>

          <TabsContent className="pt-4" value="sign-in">
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>
                  The real shared login form with simulated server actions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {flow.session ? (
                  <SignedInView
                    onOpenSettings={() => flow.setTab("settings")}
                    onSignOut={flow.signOut}
                    session={flow.session}
                  />
                ) : (
                  <div className="mx-auto w-full max-w-md py-4">
                    <LoginForm
                      callbackPath="#signed-in"
                      key={flow.loginKey}
                      onSuccess={flow.completeSignIn}
                      showForgotPasswordLink={false}
                      showSignupLink={false}
                      signInWithPassword={flow.signInWithPassword}
                      startSocialSignIn={flow.startSocialSignIn}
                      redeemBackupCode={flow.redeemBackupCode}
                      validators={validators}
                      verifyEmailCode={async () => ({
                        status: "error",
                        message: "Email verification is not simulated here.",
                      })}
                      verifyMfaCode={flow.verifyMfaCode}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent className="space-y-6 pt-4" value="settings">
            <TitleCard heading="Two-factor authentication">
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Add a second step when you sign in with your password.
                </p>
                <TwoFactorSettings
                  accountLabel={flow.account.email}
                  backupCodesRemaining={
                    flow.account.totpSecret ? flow.backupCodes.length : null
                  }
                  enrollment={flow.settingsEnrollment}
                  factors={flow.factors}
                  isStartingEnrollment={flow.isStartingEnrollment}
                  onCancelEnrollment={flow.cancelSettingsEnrollment}
                  onEnrollmentDone={flow.finishSettingsEnrollment}
                  onRegenerateBackupCodes={flow.regenerateBackupCodes}
                  onRemoveFactor={flow.removeFactor}
                  onStartEnrollment={flow.startSettingsEnrollment}
                  onVerifyEnrollment={flow.verifySettingsEnrollment}
                  removingFactorId={flow.removingFactorId}
                  status="ready"
                />
              </div>
            </TitleCard>
          </TabsContent>
        </Tabs>

        <SimulatorPanel
          account={flow.account}
          backupCodeCount={flow.backupCodes.length}
          log={flow.log}
          onReset={flow.reset}
          onToggleOrgRequiresMfa={flow.setOrgRequiresMfa}
          orgRequiresMfa={flow.orgRequiresMfa}
          pending={flow.pending}
          session={flow.session}
          settingsEnrollmentSecret={flow.settingsEnrollment?.secret ?? null}
        />
      </div>
    </DesignSystemFrame>
  );
}
