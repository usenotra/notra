import { onboardingWorkspaceSchema } from "@notra/schemas/dashboard/onboarding/workspace";

import {
  saveOnboardingAttribution,
  saveOnboardingNotificationSettings,
  triggerOnboardingAgentSetup,
  triggerOnboardingBrandAnalysis,
} from "@/app/onboarding/workspace/actions";
import { authClient } from "@/lib/auth/client";
import { dashboardOrpc } from "@/lib/orpc/query";
import { uploadFile } from "@/lib/upload/client";
import { generateOrganizationAvatar } from "@/lib/utils";
import type { SubmitWorkspaceFormArgs } from "@/types/onboarding";
import { setLastVisitedOrganization } from "@/utils/cookies";

async function setOrganizationLogo(organizationId: string, logoUrl: string) {
  const result = await authClient.organization.update({
    organizationId,
    data: { logo: logoUrl },
  });

  if (result.error) {
    throw new Error(result.error.message ?? "Failed to set workspace logo");
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

export async function submitWorkspaceForm({
  existingOrg,
  logoFile,
  logoSourceUrl,
  value,
}: SubmitWorkspaceFormArgs) {
  const parsed = onboardingWorkspaceSchema.safeParse(value);

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Please check your inputs"
    );
  }

  let organizationId: string;

  if (existingOrg) {
    organizationId = existingOrg.id;
    if (logoFile || logoSourceUrl) {
      await authClient.organization.setActive({
        organizationId,
      });
    }
  } else {
    const { data, error } = await authClient.organization.create({
      name: parsed.data.name,
      slug: parsed.data.slug,
      logo: generateOrganizationAvatar(parsed.data.slug),
    });

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create workspace");
    }

    organizationId = data.id;

    await authClient.organization.setActive({
      organizationId: data.id,
    });
    await setLastVisitedOrganization(data.slug);
  }

  if (logoFile || logoSourceUrl) {
    try {
      if (logoFile) {
        await applyOrganizationLogo(organizationId, logoFile);
      } else if (logoSourceUrl) {
        await applyOrganizationLogoFromUrl(organizationId, logoSourceUrl);
      }
    } catch (error) {
      console.error("[Onboarding] Failed to set organization logo", {
        organizationId,
        error,
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

  if (parsed.data.websiteUrl) {
    try {
      await triggerOnboardingBrandAnalysis({
        organizationId,
        websiteUrl: parsed.data.websiteUrl,
        name: parsed.data.name,
      });
    } catch (error) {
      console.error("[Onboarding] Background brand analysis failed", {
        organizationId,
        error,
      });
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
