import type {
  AuthPendingStepLabels,
  LoginFormLabels,
  TotpEnrollmentPanelLabels,
} from "@notra/ui/types/auth";
import type { BackupCodesPanelLabels } from "@notra/ui/types/security";
import { useTranslations } from "use-intl";

export function useBackupCodesPanelLabels(): BackupCodesPanelLabels {
  const t = useTranslations("settings.twoFactor.backupCodes");
  const tCommon = useTranslations("common");

  return {
    title: t("title"),
    description: t("description"),
    download: tCommon("actions.download"),
    print: t("print"),
    done: tCommon("actions.done"),
    copyError: t("copyError"),
    printBlocked: t("printBlocked"),
    printNote: t("printNote"),
    exportTitle: (issuer) => t("exportTitle", { issuer }),
    exportAccount: (account) => t("exportAccount", { account }),
    exportGenerated: (date) => t("exportGenerated", { date }),
    exportInstructions: t("exportInstructions"),
    fileName: (issuer) => t("fileName", { issuer: issuer.toLowerCase() }),
  };
}

export function useTotpEnrollmentPanelLabels(): TotpEnrollmentPanelLabels {
  const t = useTranslations("settings.twoFactor.enrollment");
  const tCommon = useTranslations("common");
  const tSettingsShared = useTranslations("settings.shared");
  const backupCodesPanel = useBackupCodesPanelLabels();

  return {
    submit: t("submit"),
    cancel: tCommon("actions.cancel"),
    done: tCommon("actions.done"),
    back: tCommon("actions.back"),
    continue: tCommon("actions.continue"),
    scanInstructions: t("scanInstructions"),
    qrAlt: (account) =>
      account ? t("qrAltWithAccount", { account }) : t("qrAlt"),
    cantScan: t("cantScan"),
    manualInstructions: t("manualInstructions"),
    setupKey: t("setupKey"),
    setupUri: t("setupUri"),
    copyValue: (label) => tCommon("labels.copyLabel", { label }),
    valueCopied: (label) => tCommon("labels.labelCopied", { label }),
    scanInstead: t("scanInstead"),
    codeLabel: t("codeLabel"),
    errorFallback: tSettingsShared("thatCodeDidnTWork"),
    backupCodesPanel,
  };
}

export function useAuthPendingStepLabels(): AuthPendingStepLabels {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const tTwoFactor = useTranslations("settings.twoFactor");
  const tSettingsShared = useTranslations("settings.shared");
  const tActions = useTranslations("common.actions");
  const enrollmentPanel = useTotpEnrollmentPanelLabels();
  const backupCodesPanel = useBackupCodesPanelLabels();
  const codeErrorFallback = tSettingsShared("thatCodeDidnTWork");

  return {
    emailVerification: {
      title: t("forgotPassword.checkEmailTitle"),
      description: (email) =>
        email
          ? t("emailVerification.description", { email })
          : t("emailVerification.descriptionNoEmail"),
      codeLabel: t("emailVerification.codeLabel"),
      submit: t("emailVerification.submit"),
      errorFallback: t("emailVerification.errorFallback"),
    },
    mfaChallenge: {
      title: tCommon("labels.twoFactorAuthentication"),
      description: (email) =>
        email
          ? t("mfaChallenge.description", { email })
          : t("mfaChallenge.descriptionNoEmail"),
      codeLabel: t("mfaChallenge.codeLabel"),
      submit: t("mfaChallenge.submit"),
      useBackupCode: t("mfaChallenge.useBackupCode"),
      backToSignIn: t("mfaChallenge.backToSignIn"),
      backupTitle: t("mfaChallenge.backupTitle"),
      backupDescription: t("mfaChallenge.backupDescription"),
      backupCodeLabel: t("mfaChallenge.backupCodeLabel"),
      backupSubmit: t("mfaChallenge.backupSubmit"),
      useAuthenticator: t("mfaChallenge.useAuthenticator"),
      issuedCodesTitle: t("mfaChallenge.issuedCodesTitle"),
      issuedCodesDescription: t("mfaChallenge.issuedCodesDescription"),
      issuedCodesDone: tActions("continue"),
      errorFallback: codeErrorFallback,
      backupCodesPanel,
    },
    mfaEnrollment: {
      title: tTwoFactor("settings.dialogTitle"),
      description: (email) =>
        email
          ? t("mfaEnrollment.description", { email })
          : t("mfaEnrollment.descriptionNoEmail"),
      submit: t("mfaEnrollment.submit"),
      cancel: t("mfaChallenge.backToSignIn"),
      done: t("mfaEnrollment.done"),
      errorFallback: codeErrorFallback,
      enrollmentPanel,
    },
  };
}

export function useLoginFormLabels(): LoginFormLabels {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const pendingStep = useAuthPendingStepLabels();

  return {
    title: t("loginForm.title"),
    description: t("loginForm.description"),
    emailLabel: tCommon("labels.email"),
    emailPlaceholder: t("signup.emailPlaceholder"),
    passwordLabel: tCommon("labels.password"),
    passwordPlaceholder: t("loginForm.passwordPlaceholder"),
    or: t("signup.or"),
    lastUsed: t("loginForm.lastUsed"),
    submit: t("loginForm.submit"),
    forgotPassword: t("forgotPassword.title"),
    resetPassword: t("loginForm.resetPassword"),
    noAccount: t("loginForm.noAccount"),
    register: t("loginForm.register"),
    loginErrorFallback: t("loginForm.loginErrorFallback"),
    socialErrorFallback: t("loginErrors.socialSignInFailed"),
    backupCodeRecovered: (email) =>
      t("loginForm.backupCodeRecovered", { email }),
    pendingStep,
  };
}
