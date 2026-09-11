"use client";

import { loginSchema } from "@notra/schemas/dashboard/auth/credentials";
import { LoginForm } from "@notra/ui/components/shared/auth/login-form";
import { PasskeysSettings } from "@notra/ui/components/shared/security/passkeys-settings";
import { StepUpVerification } from "@notra/ui/components/shared/security/step-up-verification";
import { TwoFactorSettings } from "@notra/ui/components/shared/security/two-factor-settings";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@notra/ui/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@notra/ui/components/ui/dialog";
import { Label } from "@notra/ui/components/ui/label";
import { Switch } from "@notra/ui/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import type {
  AuthFlowResult,
  SignInWithPasswordInput,
  StartPasskeySignInInput,
  TotpVerifyResult,
  RedeemBackupCodeInput,
  VerifyMfaCodeInput,
} from "@notra/ui/lib/auth-types";
import type {
  BackupCodesOutcome,
  SecurityActionOutcome,
} from "@notra/ui/lib/security-types";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { DesignSystemFrame } from "@/components/design-system/design-system-frame";
import { TOTP_ISSUER } from "@/constants/security";
import {
  buildOtpauthUri,
  generateTotpCode,
  generateTotpSecret,
  secondsUntilNextTotp,
  verifyTotpCode,
} from "@/lib/auth/dev-totp";
import {
  bufferToBase64Url,
  createPasskeyCredential,
  getPasskeyAssertion,
  isPasskeySupported,
} from "@/lib/auth/webauthn-client";
import type {
  AuthFlowTab,
  DevAccount,
  DevElevatedAccess,
  DevEmailMessage,
  DevLogEntry,
  DevPasskey,
  DevPendingAuth,
  DevSession,
  DevSettingsEnrollment,
} from "@/types/design-system/auth-flow";
import { buildPlaceholderQrCode } from "@/utils/design-system-qr";

const DEFAULT_EMAIL = "jane@company.com";
const DEFAULT_PASSWORD = "playground-pass";
const SIMULATED_LATENCY_MS = 450;
const ELEVATED_ACCESS_MS = 10 * 60 * 1000;
const WEBAUTHN_TIMEOUT_MS = 60_000;
const CHALLENGE_BYTES = 32;
const EMAIL_CODE_MODULUS = 1_000_000;
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;
const BACKUP_CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const MAX_LOG_ENTRIES = 40;
const TOTP_TICK_MS = 1000;
const MS_PER_SECOND = 1000;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const noop = () => {
  return;
};
const subscribeToNothing = () => noop;
const assumeSupported = () => true;

const validators = {
  email: (value: string) =>
    loginSchema.shape.email.safeParse(value).error?.issues[0]?.message,
  password: (value: string) =>
    loginSchema.shape.password.safeParse(value).error?.issues[0]?.message,
};

function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

function randomChallenge() {
  const bytes = new Uint8Array(CHALLENGE_BYTES);
  crypto.getRandomValues(bytes);
  return bufferToBase64Url(bytes.buffer);
}

function randomBackupCodes() {
  const bytes = new Uint8Array(BACKUP_CODE_COUNT * BACKUP_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from({ length: BACKUP_CODE_COUNT }, (_, index) =>
    Array.from(
      bytes.slice(index * BACKUP_CODE_LENGTH, (index + 1) * BACKUP_CODE_LENGTH),
      (byte) => BACKUP_CODE_ALPHABET[byte % BACKUP_CODE_ALPHABET.length]
    ).join("")
  );
}

function randomEmailCode() {
  const [value] = crypto.getRandomValues(new Uint32Array(1));
  return String((value ?? 0) % EMAIL_CODE_MODULUS).padStart(6, "0");
}

function formatClock(iso: string) {
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

function SimulatorPanel({
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

function SignedInView({
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

export function AuthFlowPlayground() {
  const [account, setAccount] = useState<DevAccount>({
    email: DEFAULT_EMAIL,
    password: DEFAULT_PASSWORD,
    totpSecret: null,
    totpEnrolledAt: null,
    passkeys: [],
  });
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [orgRequiresMfa, setOrgRequiresMfa] = useState(false);
  const [session, setSession] = useState<DevSession | null>(null);
  const [pending, setPending] = useState<DevPendingAuth | null>(null);
  const [inbox, setInbox] = useState<DevEmailMessage[]>([]);
  const [log, setLog] = useState<DevLogEntry[]>([]);
  const [tab, setTab] = useState<AuthFlowTab>("sign-in");
  const [loginKey, setLoginKey] = useState(0);

  const [settingsEnrollment, setSettingsEnrollment] =
    useState<DevSettingsEnrollment | null>(null);
  const [isStartingEnrollment, setIsStartingEnrollment] = useState(false);
  const [removingFactorId, setRemovingFactorId] = useState<string | null>(null);
  const [elevated, setElevated] = useState<DevElevatedAccess>({
    challengeId: null,
    code: null,
    grantedUntil: null,
  });
  const [stepUpResume, setStepUpResume] = useState<(() => void) | null>(null);
  // Mirrors `elevated.grantedUntil` so a resumed action sees the grant
  // synchronously instead of the closure it was created in.
  const elevatedUntilRef = useRef<number | null>(null);
  const [isAddingPasskey, setIsAddingPasskey] = useState(false);
  const [removingPasskeyId, setRemovingPasskeyId] = useState<string | null>(
    null
  );

  const passkeysSupported = useSyncExternalStore(
    subscribeToNothing,
    isPasskeySupported,
    assumeSupported
  );

  const appendLog = useCallback((message: string) => {
    setLog((current) =>
      [
        { id: randomId("log"), at: new Date().toISOString(), message },
        ...current,
      ].slice(0, MAX_LOG_ENTRIES)
    );
  }, []);

  function reset() {
    setAccount({
      email: DEFAULT_EMAIL,
      password: DEFAULT_PASSWORD,
      totpSecret: null,
      totpEnrolledAt: null,
      passkeys: [],
    });
    setBackupCodes([]);
    setOrgRequiresMfa(false);
    setSession(null);
    setPending(null);
    setInbox([]);
    setLog([]);
    setSettingsEnrollment(null);
    setElevated({ challengeId: null, code: null, grantedUntil: null });
    elevatedUntilRef.current = null;
    setStepUpResume(null);
    setTab("sign-in");
    setLoginKey((key) => key + 1);
  }

  function signOut() {
    setSession(null);
    setElevated({ challengeId: null, code: null, grantedUntil: null });
    elevatedUntilRef.current = null;
    setSettingsEnrollment(null);
    setTab("sign-in");
    setLoginKey((key) => key + 1);
    appendLog("Session ended");
  }

  // --- Sign-in handlers (stand in for the WorkOS server actions) -----------

  async function signInWithPassword(
    input: SignInWithPasswordInput
  ): Promise<AuthFlowResult> {
    await wait(SIMULATED_LATENCY_MS);
    const matches =
      input.email.trim().toLowerCase() === account.email &&
      input.password === account.password;
    if (!matches) {
      appendLog("authenticateWithPassword → invalid credentials");
      return { status: "error", message: "Invalid email or password." };
    }

    if (account.totpSecret) {
      const next: DevPendingAuth = {
        token: randomId("pending"),
        challengeId: randomId("auth_challenge"),
        kind: "mfa",
        enrollmentSecret: null,
      };
      setPending(next);
      appendLog("authenticateWithPassword → mfa_challenge, challenge created");
      return {
        status: "mfa-required",
        pendingAuthenticationToken: next.token,
        authenticationChallengeId: next.challengeId,
        email: account.email,
        recoveryToken: next.token,
      };
    }

    if (orgRequiresMfa) {
      const secret = generateTotpSecret();
      const next: DevPendingAuth = {
        token: randomId("pending"),
        challengeId: randomId("auth_challenge"),
        kind: "enrollment",
        enrollmentSecret: secret,
      };
      setPending(next);
      appendLog("authenticateWithPassword → mfa_enrollment, factor created");
      return {
        status: "mfa-enrollment-required",
        pendingAuthenticationToken: next.token,
        authenticationChallengeId: next.challengeId,
        email: account.email,
        qrCode: buildPlaceholderQrCode(1),
        secret,
        otpauthUri: buildOtpauthUri(secret, TOTP_ISSUER, account.email),
      };
    }

    setSession({
      email: account.email,
      method: "password",
      secondFactor: null,
      signedInAt: new Date().toISOString(),
    });
    appendLog("authenticateWithPassword → session created");
    return { status: "success", redirectTo: "#signed-in" };
  }

  async function verifyMfaCode(
    input: VerifyMfaCodeInput
  ): Promise<AuthFlowResult> {
    await wait(SIMULATED_LATENCY_MS);
    if (
      !pending ||
      pending.token !== input.pendingAuthenticationToken ||
      pending.challengeId !== input.authenticationChallengeId
    ) {
      appendLog("authenticateWithTotp → unknown challenge");
      return {
        status: "error",
        message: "This sign-in attempt expired. Please start again.",
      };
    }

    const secret =
      pending.kind === "enrollment"
        ? pending.enrollmentSecret
        : account.totpSecret;
    if (!secret) {
      return { status: "error", message: "No authenticator enrolled." };
    }

    const valid = await verifyTotpCode(secret, input.code);
    if (!valid) {
      appendLog("authenticateWithTotp → invalid code");
      return {
        status: "error",
        message: "That code didn't work. Please try again.",
      };
    }

    let issuedCodes: string[] | undefined;
    if (pending.kind === "enrollment") {
      setAccount((current) => ({
        ...current,
        totpSecret: secret,
        totpEnrolledAt: new Date().toISOString(),
      }));
      issuedCodes = randomBackupCodes();
      setBackupCodes(issuedCodes);
      appendLog(
        "authenticateWithTotp → factor verified and enrolled, backup codes issued"
      );
    } else {
      appendLog("authenticateWithTotp → code accepted");
    }
    setPending(null);
    setSession({
      email: account.email,
      method: "password",
      secondFactor: "totp",
      signedInAt: new Date().toISOString(),
    });
    return {
      status: "success",
      redirectTo: "#signed-in",
      backupCodes: issuedCodes,
    };
  }

  async function redeemBackupCode(
    input: RedeemBackupCodeInput
  ): Promise<AuthFlowResult> {
    await wait(SIMULATED_LATENCY_MS);
    if (!pending || pending.token !== input.recoveryToken) {
      return {
        status: "error",
        message: "This sign-in attempt expired. Please start again.",
      };
    }
    const normalized = input.code.toLowerCase().replaceAll("-", "").trim();
    if (!backupCodes.includes(normalized)) {
      appendLog("redeemBackupCode → rejected");
      return {
        status: "error",
        message: "That backup code isn't valid or was already used.",
      };
    }
    setBackupCodes([]);
    setAccount((current) => ({
      ...current,
      totpSecret: null,
      totpEnrolledAt: null,
    }));
    setPending(null);
    appendLog("redeemBackupCode → accepted, authenticator removed");
    return { status: "recovered", email: account.email };
  }

  async function startSocialSignIn() {
    await wait(SIMULATED_LATENCY_MS);
    appendLog("Social sign-in is not simulated in this playground");
    throw new Error("Social sign-in is not part of this playground.");
  }

  async function startPasskeySignIn(
    _input: StartPasskeySignInInput
  ): Promise<void> {
    if (account.passkeys.length === 0) {
      appendLog("Passkey sign-in → no passkeys registered");
      throw new Error("No passkey registered for this account yet.");
    }

    appendLog("Passkey sign-in → navigator.credentials.get");
    const assertion = await getPasskeyAssertion({
      challenge: randomChallenge(),
      rpId: window.location.hostname,
      timeout: WEBAUTHN_TIMEOUT_MS,
      userVerification: "preferred",
      allowCredentials: account.passkeys.map((passkey) => ({
        id: passkey.id,
        type: "public-key",
      })),
    });
    if (!assertion.ok) {
      appendLog(`Passkey sign-in → ${assertion.message}`);
      throw new Error(assertion.message);
    }

    const used = account.passkeys.find(
      (passkey) => passkey.id === assertion.response.id
    );
    if (!used) {
      appendLog("Passkey sign-in → unknown credential");
      throw new Error("That passkey is not registered here.");
    }

    const now = new Date().toISOString();
    setAccount((current) => ({
      ...current,
      passkeys: current.passkeys.map((passkey) =>
        passkey.id === used.id ? { ...passkey, lastUsedAt: now } : passkey
      ),
    }));
    setSession({
      email: account.email,
      method: "passkey",
      secondFactor: null,
      signedInAt: now,
    });
    appendLog(`Passkey sign-in → session created with "${used.name}"`);
  }

  // --- Settings handlers ----------------------------------------------------

  async function startSettingsEnrollment() {
    setIsStartingEnrollment(true);
    await wait(SIMULATED_LATENCY_MS);
    const secret = generateTotpSecret();
    setSettingsEnrollment({
      secret,
      qrCode: buildPlaceholderQrCode(2),
      otpauthUri: buildOtpauthUri(secret, TOTP_ISSUER, account.email),
    });
    setIsStartingEnrollment(false);
    appendLog("createUserAuthFactor → totp factor + challenge created");
  }

  async function verifySettingsEnrollment(
    code: string
  ): Promise<TotpVerifyResult> {
    await wait(SIMULATED_LATENCY_MS);
    if (!settingsEnrollment) {
      return { ok: false, message: "Start the setup again." };
    }
    const valid = await verifyTotpCode(settingsEnrollment.secret, code);
    if (!valid) {
      appendLog("verifyChallenge → invalid code");
      return { ok: false, message: "That code didn't work. Try again." };
    }
    setAccount((current) => ({
      ...current,
      totpSecret: settingsEnrollment.secret,
      totpEnrolledAt: new Date().toISOString(),
    }));
    const codes = randomBackupCodes();
    setBackupCodes(codes);
    appendLog("verifyChallenge → factor verified, 2FA on, backup codes issued");
    toast.success("Two-factor authentication is on");
    return { ok: true, backupCodes: codes };
  }

  async function regenerateBackupCodes(): Promise<BackupCodesOutcome> {
    await wait(SIMULATED_LATENCY_MS);
    const codes = randomBackupCodes();
    setBackupCodes(codes);
    appendLog("regenerateBackupCodes → new set issued");
    return { ok: true, codes };
  }

  function cancelSettingsEnrollment() {
    setSettingsEnrollment(null);
    appendLog("deleteFactor → abandoned enrollment removed");
  }

  async function removeFactor(factorId: string) {
    setRemovingFactorId(factorId);
    await wait(SIMULATED_LATENCY_MS);
    setAccount((current) => ({
      ...current,
      totpSecret: null,
      totpEnrolledAt: null,
    }));
    setBackupCodes([]);
    setRemovingFactorId(null);
    appendLog("deleteFactor → 2FA off");
    toast.success("Two-factor authentication turned off");
  }

  function hasElevatedAccess() {
    const grantedUntil = elevatedUntilRef.current;
    return grantedUntil !== null && grantedUntil > Date.now();
  }

  function requireElevatedAccess(resume: () => void) {
    if (hasElevatedAccess()) {
      return true;
    }
    appendLog("Elevated access required → asking for email verification");
    setStepUpResume(() => resume);
    return false;
  }

  async function sendStepUpCode(): Promise<SecurityActionOutcome> {
    await wait(SIMULATED_LATENCY_MS);
    const code = randomEmailCode();
    const challengeId = randomId("auth_challenge");
    setElevated({ challengeId, code, grantedUntil: null });
    setInbox((current) => [
      {
        id: randomId("mail"),
        code,
        purpose: "Confirm it's you",
        sentAt: new Date().toISOString(),
      },
      ...current,
    ]);
    appendLog("send-verification → email code sent");
    return { ok: true };
  }

  async function verifyStepUpCode(
    code: string
  ): Promise<SecurityActionOutcome> {
    await wait(SIMULATED_LATENCY_MS);
    if (!elevated.code || elevated.code !== code) {
      appendLog("verify → invalid email code");
      return { ok: false, message: "That code didn't work. Try again." };
    }
    const grantedUntil = Date.now() + ELEVATED_ACCESS_MS;
    elevatedUntilRef.current = grantedUntil;
    setElevated({ challengeId: null, code: null, grantedUntil });
    appendLog("verify → elevated access granted for 10 minutes");
    const resume = stepUpResume;
    setStepUpResume(null);
    if (resume) {
      setTimeout(resume, 0);
    }
    return { ok: true };
  }

  async function addPasskey() {
    if (!requireElevatedAccess(addPasskey)) {
      return;
    }
    setIsAddingPasskey(true);
    try {
      appendLog("registerPasskey → navigator.credentials.create");
      const created = await createPasskeyCredential({
        challenge: randomChallenge(),
        rp: { name: `${TOTP_ISSUER} (dev)`, id: window.location.hostname },
        user: {
          id: bufferToBase64Url(
            new TextEncoder().encode(account.email).buffer as ArrayBuffer
          ),
          name: account.email,
          displayName: account.email,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" },
        ],
        timeout: WEBAUTHN_TIMEOUT_MS,
        attestation: "none",
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
        excludeCredentials: account.passkeys.map((passkey) => ({
          id: passkey.id,
          type: "public-key",
        })),
      });
      if (!created.ok) {
        appendLog(`registerPasskey → ${created.message}`);
        if (!created.cancelled) {
          toast.error(created.message);
        }
        return;
      }
      const registration = created.response;

      const passkey: DevPasskey = {
        id: registration.id,
        name: `Passkey ${account.passkeys.length + 1} · ${registration.authenticatorAttachment ?? "device"}`,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
      };
      setAccount((current) => ({
        ...current,
        passkeys: [...current.passkeys, passkey],
      }));
      appendLog(`verifyPasskey → registered "${passkey.name}"`);
      toast.success("Passkey added");
    } catch {
      appendLog("registerPasskey → unexpected failure");
      toast.error("Couldn't create a passkey on this device.");
    } finally {
      setIsAddingPasskey(false);
    }
  }

  async function removePasskey(passkeyId: string) {
    if (!requireElevatedAccess(() => removePasskey(passkeyId))) {
      return;
    }
    setRemovingPasskeyId(passkeyId);
    await wait(SIMULATED_LATENCY_MS);
    setAccount((current) => ({
      ...current,
      passkeys: current.passkeys.filter((passkey) => passkey.id !== passkeyId),
    }));
    setRemovingPasskeyId(null);
    appendLog("deletePasskey → removed");
    toast.success("Passkey removed");
  }

  const factors = account.totpSecret
    ? [
        {
          id: "auth_factor_playground",
          issuer: TOTP_ISSUER,
          createdAt: account.totpEnrolledAt ?? "",
        },
      ]
    : [];

  return (
    <DesignSystemFrame
      description={
        <>
          End-to-end sign-in, two-factor, and passkey flow against an in-browser
          stand-in for WorkOS. TOTP codes are real (RFC 6238) and passkeys use
          real WebAuthn on this origin, so Touch ID / Windows Hello prompts are
          genuine. Nothing here talks to WorkOS or the database.
        </>
      }
      title="Auth flow playground"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Tabs
          onValueChange={(value) => setTab(value as AuthFlowTab)}
          value={tab}
        >
          <TabsList>
            <TabsTrigger value="sign-in">Sign in</TabsTrigger>
            <TabsTrigger disabled={!session} value="settings">
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
                {session ? (
                  <SignedInView
                    onOpenSettings={() => setTab("settings")}
                    onSignOut={signOut}
                    session={session}
                  />
                ) : (
                  <div className="mx-auto w-full max-w-md py-4">
                    <LoginForm
                      callbackPath="#signed-in"
                      key={loginKey}
                      onSuccess={() => setTab("sign-in")}
                      showForgotPasswordLink={false}
                      showSignupLink={false}
                      signInWithPassword={signInWithPassword}
                      startPasskeySignIn={startPasskeySignIn}
                      startSocialSignIn={startSocialSignIn}
                      redeemBackupCode={redeemBackupCode}
                      validators={validators}
                      verifyEmailCode={async () => ({
                        status: "error",
                        message: "Email verification is not simulated here.",
                      })}
                      verifyMfaCode={verifyMfaCode}
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
                  accountLabel={account.email}
                  backupCodesRemaining={
                    account.totpSecret ? backupCodes.length : null
                  }
                  enrollment={settingsEnrollment}
                  factors={factors}
                  isStartingEnrollment={isStartingEnrollment}
                  onCancelEnrollment={cancelSettingsEnrollment}
                  onEnrollmentDone={() => setSettingsEnrollment(null)}
                  onRegenerateBackupCodes={regenerateBackupCodes}
                  onRemoveFactor={removeFactor}
                  onStartEnrollment={startSettingsEnrollment}
                  onVerifyEnrollment={verifySettingsEnrollment}
                  removingFactorId={removingFactorId}
                  status="ready"
                />
              </div>
            </TitleCard>

            <TitleCard heading="Passkeys">
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Passkeys let you sign in with your device instead of a
                  password.
                </p>
                <PasskeysSettings
                  isAdding={isAddingPasskey}
                  isSupported={passkeysSupported}
                  onAddPasskey={addPasskey}
                  onRemovePasskey={removePasskey}
                  passkeys={account.passkeys}
                  removingPasskeyId={removingPasskeyId}
                  status="ready"
                />
                <p className="text-muted-foreground text-xs">
                  Elevated access:{" "}
                  {elevated.grantedUntil === null
                    ? "not granted"
                    : `granted until ${formatClock(new Date(elevated.grantedUntil).toISOString())}`}
                </p>
              </div>
            </TitleCard>
          </TabsContent>
        </Tabs>

        <SimulatorPanel
          account={account}
          backupCodeCount={backupCodes.length}
          inbox={inbox}
          log={log}
          onReset={reset}
          onToggleOrgRequiresMfa={setOrgRequiresMfa}
          orgRequiresMfa={orgRequiresMfa}
          pending={pending}
          session={session}
          settingsEnrollmentSecret={settingsEnrollment?.secret ?? null}
        />
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setStepUpResume(null);
          }
        }}
        open={stepUpResume !== null}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm it&apos;s you</DialogTitle>
            <DialogDescription>
              Managing passkeys needs a quick email verification. The code lands
              in the simulated inbox on the right.
            </DialogDescription>
          </DialogHeader>
          {stepUpResume !== null && (
            <StepUpVerification
              email={account.email}
              onCancel={() => setStepUpResume(null)}
              onSendCode={sendStepUpCode}
              onVerify={verifyStepUpCode}
            />
          )}
        </DialogContent>
      </Dialog>
    </DesignSystemFrame>
  );
}
