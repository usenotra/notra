import { SITE_CONFIG_FILENAME } from "@notra/sites-core/constants/sites";
import { siteIntegrationsSchema } from "@notra/sites-core/schemas/site-integrations";

import {
  discardSiteDraft,
  listSiteDrafts,
  readSiteSourceFile,
  saveSiteDraft,
} from "./editor";
import { SiteInputError } from "./errors";
import type {
  SaveSiteIntegrationsInput,
  SiteIntegrationsState,
} from "./types/integrations";
import type { Site } from "./types/sites";
import { defaultSiteConfigContent } from "./utils/default-config";
import { isRecord, safeJson } from "./utils/json";

async function currentConfig(site: Site) {
  const [file, drafts] = await Promise.all([
    readSiteSourceFile(site, SITE_CONFIG_FILENAME),
    listSiteDrafts(site.id),
  ]);
  const draft = drafts.find((entry) => entry.path === SITE_CONFIG_FILENAME);
  const content =
    draft && !draft.deleted
      ? draft.content
      : (file?.content ?? defaultSiteConfigContent(site));
  return { file, draft, content };
}

function parseConfig(
  content: string | undefined
): Record<string, unknown> | null {
  if (!content?.trim()) {
    return {};
  }
  const parsed = safeJson(content);
  return isRecord(parsed) ? parsed : null;
}

export async function readSiteIntegrations(
  site: Site
): Promise<SiteIntegrationsState> {
  const { content, draft } = await currentConfig(site);
  const config = parseConfig(content);
  return {
    integrations: isRecord(config?.integrations) ? config.integrations : {},
    hasDraft: Boolean(draft),
    invalid: config === null,
  };
}

export async function saveSiteIntegration(
  site: Site,
  input: SaveSiteIntegrationsInput
): Promise<SiteIntegrationsState> {
  const { file, draft, content } = await currentConfig(site);
  const config = parseConfig(content);
  if (!config) {
    throw new SiteInputError(
      `${SITE_CONFIG_FILENAME} isn't valid JSON. Fix it in the editor first.`
    );
  }
  const current = isRecord(config.integrations)
    ? { ...config.integrations }
    : {};
  if (input.settings) {
    current[input.provider] = input.settings;
  } else {
    delete current[input.provider];
  }
  const parsed = siteIntegrationsSchema.safeParse(current);
  if (!parsed.success) {
    throw new SiteInputError(
      parsed.error.issues[0]?.message ?? "Check the integration settings"
    );
  }
  if (Object.keys(current).length > 0) {
    config.integrations = current;
  } else {
    delete config.integrations;
  }
  const next = `${JSON.stringify(config, null, 2)}\n`;
  const observed = {
    path: SITE_CONFIG_FILENAME,
    draftId: draft?.id ?? null,
    draftRevision: draft?.revision ?? null,
    sourceContext: {
      productionBranch: site.productionBranch,
      rootDirectory: site.rootDirectory,
    },
  };
  if (file && next === file.content) {
    await discardSiteDraft(site, observed);
    return { integrations: current, hasDraft: false, invalid: false };
  }
  await saveSiteDraft(site, {
    ...observed,
    content: next,
    baseBlobSha: draft ? draft.baseBlobSha : (file?.sha ?? null),
    baseCommitSha: draft?.baseCommitSha ?? null,
    userId: input.userId,
  });
  return { integrations: current, hasDraft: true, invalid: false };
}
