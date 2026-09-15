"use client";

import { BACKUP_CODE_LENGTH } from "@notra/schemas/constants/dashboard/auth";
import type {
  AuthFlowResult,
  RedeemBackupCodeInput,
  RedeemBackupCodeResult,
  SignInWithPasswordInput,
  VerifyMfaCodeInput,
} from "@notra/schemas/types/dashboard/auth";
import { normalizeBackupCode } from "@notra/schemas/utils/auth";
import type {
  TotpEnrollmentSubmission,
  TotpVerifyResult,
} from "@notra/ui/types/auth";
import type { BackupCodesOutcome } from "@notra/ui/types/security";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { TOTP_ISSUER } from "@/constants/security";
import {
  buildOtpauthUri,
  generateTotpSecret,
  verifyTotpCode,
} from "@/lib/auth/dev-totp";
import type {
  AuthFlowTab,
  DevAccount,
  DevLogEntry,
  DevPendingAuth,
  DevSession,
  DevSettingsEnrollment,
} from "@/types/design-system/auth-flow";
import { buildPlaceholderQrCode } from "@/utils/design-system-qr";

const DEFAULT_EMAIL = "jane@company.com";
const DEFAULT_PASSWORD = "playground-pass";
const SIMULATED_LATENCY_MS = 450;
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const MAX_LOG_ENTRIES = 40;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
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

/**
 * In-browser stand-in for the WorkOS side of the auth flow. Returns the
 * simulated account state plus handlers shaped like the real server actions.
 */
export function useAuthFlowPlayground() {
  const [account, setAccount] = useState<DevAccount>({
    email: DEFAULT_EMAIL,
    password: DEFAULT_PASSWORD,
    totpSecret: null,
    totpEnrolledAt: null,
    totpName: null,
  });
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [orgRequiresMfa, setOrgRequiresMfa] = useState(false);
  const [session, setSession] = useState<DevSession | null>(null);
  const [pending, setPending] = useState<DevPendingAuth | null>(null);
  const [log, setLog] = useState<DevLogEntry[]>([]);
  const [tab, setTab] = useState<AuthFlowTab>("sign-in");
  const [loginKey, setLoginKey] = useState(0);

  const [settingsEnrollment, setSettingsEnrollment] =
    useState<DevSettingsEnrollment | null>(null);
  const [isStartingEnrollment, setIsStartingEnrollment] = useState(false);
  const [removingFactorId, setRemovingFactorId] = useState<string | null>(null);
  // A first-time enrollment shows backup codes before the redirect, so the
  // session only becomes visible once the login form reports completion.
  const pendingSessionRef = useRef<DevSession | null>(null);
  // Handlers are captured by the login form at render time; reading through
  // a ref keeps a re-submitted sign-in (after a backup code) on fresh state.
  const accountRef = useRef(account);
  useEffect(() => {
    accountRef.current = account;
  }, [account]);

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
      totpName: null,
    });
    setBackupCodes([]);
    setOrgRequiresMfa(false);
    setSession(null);
    setPending(null);
    setLog([]);
    setSettingsEnrollment(null);
    setTab("sign-in");
    setLoginKey((key) => key + 1);
  }

  function signOut() {
    setSession(null);
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
    const account = accountRef.current;
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
        factorId: "auth_factor_playground",
        email: account.email,
        qrCode: buildPlaceholderQrCode(1),
        secret,
        otpauthUri: buildOtpauthUri(secret, TOTP_ISSUER, account.email),
      };
    }

    setSession({
      email: account.email,
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

    const nextSession: DevSession = {
      email: account.email,
      secondFactor: "totp",
      signedInAt: new Date().toISOString(),
    };
    setPending(null);

    if (pending.kind !== "enrollment") {
      appendLog("authenticateWithTotp → code accepted");
      setSession(nextSession);
      return { status: "success", redirectTo: "#signed-in" };
    }

    setAccount((current) => ({
      ...current,
      totpSecret: secret,
      totpEnrolledAt: new Date().toISOString(),
      totpName: input.factorLabel?.name ?? null,
    }));
    const issuedCodes = randomBackupCodes();
    setBackupCodes(issuedCodes);
    pendingSessionRef.current = nextSession;
    appendLog(
      "authenticateWithTotp → factor verified and enrolled, backup codes issued"
    );
    return {
      status: "enrolled",
      redirectTo: "#signed-in",
      backupCodes: issuedCodes,
    };
  }

  async function redeemBackupCode(
    input: RedeemBackupCodeInput
  ): Promise<RedeemBackupCodeResult> {
    await wait(SIMULATED_LATENCY_MS);
    if (!pending || pending.challengeId !== input.authenticationChallengeId) {
      return {
        status: "error",
        message: "This sign-in attempt expired. Please start again.",
      };
    }
    const normalized = normalizeBackupCode(input.code);
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
      totpName: null,
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

  async function verifySettingsEnrollment({
    code,
    name,
  }: TotpEnrollmentSubmission): Promise<TotpVerifyResult> {
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
      totpName: name,
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
      totpName: null,
    }));
    setBackupCodes([]);
    setRemovingFactorId(null);
    appendLog("deleteFactor → 2FA off");
    toast.success("Two-factor authentication turned off");
  }

  const factors = account.totpSecret
    ? [
        {
          id: "auth_factor_playground",
          name: account.totpName,
          issuer: TOTP_ISSUER,
          createdAt: account.totpEnrolledAt ?? "",
        },
      ]
    : [];

  /** The login form finished; a held-back enrollment session becomes visible. */
  function completeSignIn() {
    if (pendingSessionRef.current) {
      setSession(pendingSessionRef.current);
      pendingSessionRef.current = null;
    }
    setTab("sign-in");
  }

  return {
    account,
    backupCodes,
    factors,
    log,
    loginKey,
    orgRequiresMfa,
    pending,
    session,
    settingsEnrollment,
    isStartingEnrollment,
    removingFactorId,
    tab,
    setTab,
    setOrgRequiresMfa,
    reset,
    signOut,
    completeSignIn,
    signInWithPassword,
    verifyMfaCode,
    redeemBackupCode,
    startSocialSignIn,
    startSettingsEnrollment,
    verifySettingsEnrollment,
    finishSettingsEnrollment: () => setSettingsEnrollment(null),
    cancelSettingsEnrollment,
    regenerateBackupCodes,
    removeFactor,
  };
}
