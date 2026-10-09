"use client";

import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CtaButton,
  ctaButtonVariants,
} from "@notra/ui/components/shared/cta-button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { type ReactNode, useState } from "react";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { authClient } from "@/lib/auth/client";
import {
  acceptInvitation,
  declineInvitation,
} from "@/routes/-invitation-loaders";
import type {
  InvitationDecision,
  InvitationOrganization,
  InvitationPageData,
  PendingInvitation,
} from "@/types/invitation";
import { nameInitials } from "@/utils/name-initials";

function OrganizationAvatar({
  organization,
}: {
  organization: InvitationOrganization;
}) {
  return (
    <Avatar className="size-16" shape="squircle">
      <AvatarImage alt="" src={organization.logo ?? undefined} />
      <AvatarFallback>{nameInitials(organization.name)}</AvatarFallback>
    </Avatar>
  );
}

function InviterAvatar({ name }: { name: string }) {
  return (
    <Avatar className="size-16" shape="squircle">
      <AvatarFallback>{nameInitials(name)}</AvatarFallback>
    </Avatar>
  );
}

function OutcomeIcon({ outcome }: { outcome: "success" | "failure" }) {
  const success = outcome === "success";

  return (
    <span
      aria-hidden="true"
      className={`corner-squircle flex size-12 items-center justify-center rounded-xl supports-[corner-shape:squircle]:rounded-2xl ${
        success
          ? "bg-primary/10 text-primary"
          : "bg-destructive/10 text-destructive"
      }`}
    >
      <HugeiconsIcon icon={success ? Tick02Icon : Cancel01Icon} size={24} />
    </span>
  );
}

function Message({
  title,
  description,
  outcome,
  children,
}: {
  title: string;
  description: string;
  outcome?: "success" | "failure";
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-6 text-center" role="status">
      {outcome ? <OutcomeIcon outcome={outcome} /> : null}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
        <p className="text-muted-foreground text-base text-pretty">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

function Unavailable({
  reason,
}: {
  reason: Extract<InvitationPageData, { status: "unavailable" }>["reason"];
}) {
  const t = useTranslations("auth.invitation.unavailable");
  const key = reason === "missing" ? "not-found" : reason;

  return (
    <Message
      description={t(`${key}.description`)}
      outcome="failure"
      title={t(`${key}.title`)}
    >
      <a className={ctaButtonVariants()} href="/">
        {t("home")}
      </a>
    </Message>
  );
}

function Mismatch({
  data,
  currentEmail,
}: {
  data: PendingInvitation;
  currentEmail: string;
}) {
  const t = useTranslations("auth.invitation.mismatch");
  const signOut = authClient.useSignOut();
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <Message
      description={t("description", {
        invited: data.email,
        current: currentEmail,
        organization: data.organization.name,
      })}
      outcome="failure"
      title={t("title")}
    >
      <CtaButton
        loading={isSigningOut}
        onClick={() => {
          setIsSigningOut(true);
          signOut().catch(() => setIsSigningOut(false));
        }}
      >
        {t("signOut")}
      </CtaButton>
    </Message>
  );
}

function Joined({ organization }: { organization: InvitationOrganization }) {
  const t = useTranslations("auth.invitation.joined");

  return (
    <Message
      description={t("description")}
      outcome="success"
      title={t("title", { organization: organization.name })}
    >
      <a className={ctaButtonVariants()} href={`/${organization.slug}`}>
        {t("open", { organization: organization.name })}
      </a>
    </Message>
  );
}

function PendingInvitationCard({ data }: { data: PendingInvitation }) {
  const t = useTranslations("auth.invitation");
  const signOut = authClient.useSignOut();
  const [decision, setDecision] = useState<InvitationDecision>("idle");
  const [error, setError] = useState<string | null>(null);
  const { organization, inviterName, viewer } = data;
  const role =
    data.role === "admin" || data.role === "owner" ? data.role : "member";

  async function run(action: "accept" | "decline") {
    setDecision("working");
    setError(null);
    try {
      const result =
        action === "accept"
          ? await acceptInvitation({ data: { token: data.token } })
          : await declineInvitation({ data: { token: data.token } });
      if (result.ok) {
        setDecision(action === "accept" ? "accepted" : "declined");
        return;
      }
      setError(t(result.reason === "failed" ? "failed" : "unavailableNow"));
    } catch {
      setError(t("failed"));
    }
    setDecision("idle");
  }

  function declineInvitationClick() {
    void run("decline");
  }

  function switchAccount() {
    signOut().catch(() => setError(t("failed")));
  }

  function accept() {
    if (viewer.kind === "signed-out") {
      window.location.assign(data.authHref);
      return;
    }
    void run("accept");
  }

  if (viewer.kind === "mismatch") {
    return <Mismatch currentEmail={viewer.email} data={data} />;
  }
  if (decision === "accepted") {
    return <Joined organization={organization} />;
  }
  if (decision === "declined") {
    return (
      <Message
        description={t("declined.description")}
        outcome="failure"
        title={t("declined.title")}
      />
    );
  }

  const working = decision === "working";
  const title = inviterName
    ? t("title", { inviter: inviterName, organization: organization.name })
    : t("titleAnonymous", { organization: organization.name });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-4">
          {inviterName ? (
            <>
              <InviterAvatar name={inviterName} />
              <span
                aria-hidden="true"
                className="text-muted-foreground text-2xl leading-none"
              >
                +
              </span>
            </>
          ) : null}
          <OrganizationAvatar organization={organization} />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            {title}
          </h1>
          <p className="text-muted-foreground text-base text-pretty">
            {t("description", { role: t(`roles.${role}`) })}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <CtaButton className="w-full" loading={working} onClick={accept}>
          {t("join", { organization: organization.name })}
        </CtaButton>
        <Button
          className="w-full"
          disabled={working}
          onClick={declineInvitationClick}
          size="lg"
          variant="ghost"
        >
          {t("decline")}
        </Button>
        {error ? (
          <p className="text-destructive text-center text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {viewer.kind === "match" ? (
        <p className="text-muted-foreground text-center text-sm">
          {t("signedInAs", { email: data.email })}{" "}
          <button
            className="hover:text-foreground focus-visible:ring-ring/50 rounded-sm underline underline-offset-4 outline-none focus-visible:ring-3"
            onClick={switchAccount}
            type="button"
          >
            {t("useAnotherAccount")}
          </button>
        </p>
      ) : (
        <p className="text-muted-foreground text-center text-sm">
          {t("signedOutHint", { email: data.email })}
        </p>
      )}
    </div>
  );
}

export function InvitationConfirm({ data }: { data: InvitationPageData }) {
  if (data.status === "unavailable") {
    return <Unavailable reason={data.reason} />;
  }
  return <PendingInvitationCard data={data} key={data.token} />;
}
