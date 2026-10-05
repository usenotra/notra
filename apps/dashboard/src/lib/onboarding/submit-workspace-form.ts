import { onboardingWorkspaceSchema } from "@notra/schemas/dashboard/onboarding/workspace";

import {
  saveOnboardingAttribution,
  saveOnboardingNotificationSettings,
  triggerOnboardingAgentSetup,
  triggerOnboardingBrandAnalysis,
  validateOnboardingWebsiteUrl,
} from "@/app/onboarding/workspace/actions";
import { COMPANY_LOGO_SOURCE_HOSTS } from "@/constants/company-logo";
import { authClient } from "@/lib/auth/client";
import { extractDomain } from "@/lib/onboarding/company-logo";
import { dashboardOrpc } from "@/lib/orpc/query";
import { uploadFile } from "@/lib/upload/client";
import { generateOrganizationAvatar } from "@/lib/utils";
import type { SubmitWorkspaceFormArgs } from "@/types/onboarding";
import { setLastVisitedOrganization } from "@/utils/cookies";

const WWW_PREFIX_REGEX = /^www\./;

function isAllowedLogoSourceUrl(sourceUrl: string): boolean {
  try {
    const parsed = new URL(sourceUrl);
    return (
      parsed.protocol === "https:" &&
      COMPANY_LOGO_SOURCE_HOSTS.some((host) => host === parsed.hostname)
    );
  } catch {
    return false;
  }
}

async function setOrganizationLogo(organizationId: string, logoUrl: string) {
  const result = await authClient.organization.update({
    organizationId,
    data: { logo: logoUrl },
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

async function applyOrganizationLogo(organizationId: string, file: File) {
  const { url } = await uploadFile({ file, type: "logo" });
  await setOrganizationLogo(organizationId, url);
}

async function applyOrganizationLogoFromUrl(
  organizationId: string,
  sourceUrl: string
) {
  const { publicUrl } = await dashboardOrpc.upload.logoFromUrl.call({
    sourceUrl,
  });
  await setOrganizationLogo(organizationId, publicUrl);
}

function isSameWebsite(next: string, current: string | null | undefined) {
  if (!current) {
    return false;
  }
  const normalize = (url: string) =>
    extractDomain(url)?.replace(WWW_PREFIX_REGEX, "");
  return normalize(next) === normalize(current);
}

export async function submitWorkspaceForm({
  existingOrg,
  onOrganizationCreated,
  logoFile,
  logoSourceUrl,
  value,
}: SubmitWorkspaceFormArgs) {
  const parsed = onboardingWorkspaceSchema.safeParse(value);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message);
  }

  let organizationId: string;

  if (existingOrg) {
    if (parsed.data.websiteUrl) {
      const validation = await validateOnboardingWebsiteUrl(
        parsed.data.websiteUrl
      );
      if (validation.error) {
        throw new Error(validation.error.message);
      }
    }
    organizationId = existingOrg.id;
    if (logoFile || logoSourceUrl) {
      await authClient.organization.setActive({
        organizationId,
      });
    }
  } else {
    const { data, error } = await authClient.organization.create({
      websiteUrl: parsed.data.websiteUrl,
      name: parsed.data.name,
      slug: parsed.data.slug,
      logo: generateOrganizationAvatar(parsed.data.slug),
    });

    if (error || !data) {
      throw new Error(error?.message);
    }

    organizationId = data.id;
    onOrganizationCreated?.({
      ...data,
      dailySummary: parsed.data.dailySummary,
      marketingEmails: parsed.data.marketingEmails,
    });

    await authClient.organization.setActive({
      organizationId: data.id,
    });
    await setLastVisitedOrganization(data.slug);
  }

  if (logoFile || logoSourceUrl) {
    try {
      if (logoFile) {
        await applyOrganizationLogo(organizationId, logoFile);
      } else if (logoSourceUrl && isAllowedLogoSourceUrl(logoSourceUrl)) {
        await applyOrganizationLogoFromUrl(organizationId, logoSourceUrl);
      }
    } catch (error) {
      console.error("[Onboarding] Failed to set organization logo", {
        organizationId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  const notificationResult = await saveOnboardingNotificationSettings({
    organizationId,
    dailySummary: parsed.data.dailySummary,
    marketingEmails: parsed.data.marketingEmails,
  });

  if (!notificationResult.success) {
    throw new Error(notificationResult.error);
  }

  const hasAttribution = Boolean(
    parsed.data.heardAboutNotraSource || parsed.data.heardAboutNotraOther
  );
  const attributionAlreadyRecorded = Boolean(
    existingOrg?.heardAboutNotraSource || existingOrg?.heardAboutNotraOther
  );

  if (hasAttribution && !attributionAlreadyRecorded) {
    const attributionPromise = saveOnboardingAttribution({
      heardAboutNotraOther: parsed.data.heardAboutNotraOther,
      heardAboutNotraSource: parsed.data.heardAboutNotraSource,
      organizationId,
    });

    attributionPromise
      .then((result) => {
        if (!result.success) {
          console.error("[Onboarding] Failed to save attribution", {
            organizationId,
            error: result.error,
          });
        }
      })
      .catch((error) => {
        console.error("[Onboarding] Failed to save attribution", {
          organizationId,
          error,
        });
      });
  }

  if (
    parsed.data.websiteUrl &&
    !isSameWebsite(parsed.data.websiteUrl, existingOrg?.websiteUrl)
  ) {
    const analysis = await triggerOnboardingBrandAnalysis({
      organizationId,
      websiteUrl: parsed.data.websiteUrl,
      name: parsed.data.name,
    });
    if (analysis.error) {
      throw new Error(analysis.error.message);
    }
  }

  try {
    await triggerOnboardingAgentSetup({
      organizationId,
      websiteUrl: parsed.data.websiteUrl || undefined,
    });
  } catch (error) {
    console.error("[Onboarding] Background onboarding agent setup failed", {
      organizationId,
      error,
    });
  }
}
