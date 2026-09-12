"use client";

import { Badge } from "@notra/ui/components/ui/badge";
import { Label } from "@notra/ui/components/ui/label";
import { Switch } from "@notra/ui/components/ui/switch";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useEffect, useState } from "react";

import { Button } from "@/components/button";
import { TOTP_ISSUER } from "@/constants/security";
import { generateTotpCode, secondsUntilNextTotp } from "@/lib/auth/dev-totp";
import type {
  DevAccount,
  DevEmailMessage,
  DevLogEntry,
  DevPendingAuth,
  DevSession,
} from "@/types/design-system/auth-flow";

const DEFAULT_EMAIL = "jane@company.com";
const TOTP_TICK_MS = 1000;

export function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function AuthenticatorWidget({ secret }: { secret: string | null }) {
  const [code, setCode] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(secondsUntilNextTotp());

  useEffect(() => {
    if (!secret) {
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      const next = await generateTotpCode(secret);
      if (!cancelled) {
        setCode(next);
        setSecondsLeft(secondsUntilNextTotp());
      }
    };
    refresh();
    const timer = setInterval(refresh, TOTP_TICK_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [secret]);

  if (!secret) {
    return (
      <p className="text-muted-foreground text-sm">
        No account enrolled yet. Start enrollment to see codes here.
      </p>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-muted-foreground text-xs">
          {TOTP_ISSUER} · {DEFAULT_EMAIL}
        </p>
        <p className="font-mono text-2xl tracking-[0.3em] tabular-nums">
          {code ?? "······"}
        </p>
      </div>
      <Badge variant={secondsLeft <= 5 ? "warning" : "secondary"}>
        {secondsLeft}s
      </Badge>
    </div>
  );
}

export function SimulatorPanel({
  account,
  backupCodeCount,
  orgRequiresMfa,
  session,
  pending,
  settingsEnrollmentSecret,
  inbox,
  log,
  onToggleOrgRequiresMfa,
  onReset,
}: {
  account: DevAccount;
  backupCodeCount: number;
  orgRequiresMfa: boolean;
  session: DevSession | null;
  pending: DevPendingAuth | null;
  settingsEnrollmentSecret: string | null;
  inbox: DevEmailMessage[];
  log: DevLogEntry[];
  onToggleOrgRequiresMfa: (value: boolean) => void;
  onReset: () => void;
}) {
  const authenticatorSecret =
    account.totpSecret ?? pending?.enrollmentSecret ?? settingsEnrollmentSecret;

  return (
    <div className="space-y-4">
      <TitleCard
        action={
          <Button onClick={onReset} size="sm" variant="outline">
            Reset
          </Button>
        }
        heading="Simulated WorkOS"
      >
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-mono text-xs">{account.email}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Password</dt>
            <dd className="font-mono text-xs">{account.password}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Authenticator app</dt>
            <dd>
              <Badge variant={account.totpSecret ? "success" : "outline"}>
                {account.totpSecret ? "Enrolled" : "Off"}
              </Badge>
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Backup codes</dt>
            <dd>
              <Badge variant={backupCodeCount ? "success" : "outline"}>
                {backupCodeCount}
              </Badge>
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Passkeys</dt>
            <dd>
              <Badge variant={account.passkeys.length ? "success" : "outline"}>
                {account.passkeys.length}
              </Badge>
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Session</dt>
            <dd>
              {session ? (
                <Badge variant="success">
                  {session.method}
                  {session.secondFactor ? " + totp" : ""}
                </Badge>
              ) : (
                <Badge variant="outline">Signed out</Badge>
              )}
            </dd>
          </div>
        </dl>
        <div className="mt-4 flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label htmlFor="org-requires-mfa">Organization requires 2FA</Label>
            <p className="text-muted-foreground text-xs">
              Forces enrollment at sign-in when no factor exists.
            </p>
          </div>
          <Switch
            checked={orgRequiresMfa}
            id="org-requires-mfa"
            onCheckedChange={onToggleOrgRequiresMfa}
          />
        </div>
      </TitleCard>

      <TitleCard heading="Authenticator app">
        <AuthenticatorWidget secret={authenticatorSecret} />
      </TitleCard>

      <TitleCard heading="Email inbox">
        {inbox.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Verification emails show up here.
          </p>
        ) : (
          <ul className="grid gap-2 text-sm">
            {inbox.map((message) => (
              <li
                className="flex items-center justify-between gap-3"
                key={message.id}
              >
                <div>
                  <p className="font-medium">{message.purpose}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatClock(message.sentAt)}
                  </p>
                </div>
                <code className="bg-muted/50 rounded-md border px-2 py-1 font-mono text-sm tracking-widest">
                  {message.code}
                </code>
              </li>
            ))}
          </ul>
        )}
      </TitleCard>

      <TitleCard heading="Event log">
        {log.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing yet.</p>
        ) : (
          <ol className="grid max-h-72 gap-1 overflow-y-auto font-mono text-xs">
            {log.map((entry) => (
              <li className="flex gap-2" key={entry.id}>
                <span className="text-muted-foreground shrink-0">
                  {formatClock(entry.at)}
                </span>
                <span>{entry.message}</span>
              </li>
            ))}
          </ol>
        )}
      </TitleCard>
    </div>
  );
}

export function SignedInView({
  session,
  onSignOut,
  onOpenSettings,
}: {
  session: DevSession;
  onSignOut: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <Badge variant="success">Signed in</Badge>
      <div>
        <p className="text-lg font-semibold">{session.email}</p>
        <p className="text-muted-foreground text-sm">
          via {session.method}
          {session.secondFactor ? " + authenticator code" : ""} at{" "}
          {formatClock(session.signedInAt)}
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onOpenSettings}>Open security settings</Button>
        <Button onClick={onSignOut} variant="outline">
          Sign out
        </Button>
      </div>
    </div>
  );
}
