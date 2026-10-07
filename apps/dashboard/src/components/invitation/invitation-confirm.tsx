"use client";

import { Tick02Icon } from "@hugeicons/core-free-icons";
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
import { useState } from "react";
import { useTranslations } from "use-intl";

import { Button, buttonVariants } from "@/components/button";
import { authClient } from "@/lib/auth/client";
import {
  acceptInvitation,
  declineInvitation,
} from "@/routes/-invitation-loaders";
import type {
  InvitationOrganization,
  InvitationPageData,
} from "@/types/invitation";
import { nameInitials } from "@/utils/name-initials";

type Decision = "idle" | "working" | "accepted" | "declined";
type PendingInvitation = Extract<InvitationPageData, { status: "pending" }>;

const KNOWN_ROLES = ["member", "admin", "owner"] as const;

function isKnownRole(role: string): role is (typeof KNOWN_ROLES)[number] {
  return KNOWN_ROLES.some((known) => known === role);
}

function OrganizationAvatar({
  organization,
  size,
}: {
  organization: InvitationOrganization;
  size: string;
}) {
  return (
    <Avatar className={`rounded-2xl after:rounded-2xl ${size}`}>
      <AvatarImage alt="" src={organization.logo ?? undefined} />
      <AvatarFallback className="rounded-2xl">
        {nameInitials(organization.name)}
      </AvatarFallback>
    </Avatar>
  );
}

function InviterAvatar({ name }: { name: string }) {
  return (
    <Avatar className="size-16 rounded-2xl after:rounded-2xl">
      <AvatarFallback className="rounded-2xl">
        {nameInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function Message({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-6 text-center" role="status">
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
    <Message description={t(`${key}.description`)} title={t(`${key}.title`)}>
      <a
        className={buttonVariants({ size: "lg", variant: "outline" })}
        href="/"
      >
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
      title={t("title")}
    >
      <Button
        loading={isSigningOut}
        onClick={() => {
          setIsSigningOut(true);
          signOut().catch(() => setIsSigningOut(false));
        }}
        size="lg"
      >
        {t("signOut")}
      </Button>
    </Message>
  );
}

function Joined({ organization }: { organization: InvitationOrganization }) {
  const t = useTranslations("auth.invitation.joined");

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
        <HugeiconsIcon icon={Tick02Icon} size={24} />
      </span>
      <Message
        description={t("description")}
        title={t("title", { organization: organization.name })}
      >
        <a className={ctaButtonVariants()} href={`/${organization.slug}`}>
          {t("open", { organization: organization.name })}
        </a>
      </Message>
    </div>
  );
}

function PendingInvitationCard({ data }: { data: PendingInvitation }) {
  const t = useTranslations("auth.invitation");
  const signOut = authClient.useSignOut();
  const [decision, setDecision] = useState<Decision>("idle");
  const [error, setError] = useState<string | null>(null);
  const { organization, inviterName, viewer } = data;
  const role = isKnownRole(data.role) ? data.role : "member";

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
    run("decline").catch(() => undefined);
  }

  function switchAccount() {
    signOut().catch(() => undefined);
  }

  function accept() {
    if (viewer.kind === "signed-out") {
      // Sign in or sign up first; the account flow returns to this page.
      window.location.assign(data.authHref);
      return;
    }
    run("accept").catch(() => undefined);
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
          <OrganizationAvatar organization={organization} size="size-16" />
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
  return <PendingInvitationCard data={data} />;
}
