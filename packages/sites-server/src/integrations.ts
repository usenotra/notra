import { SITE_CONFIG_FILENAME } from "@notra/sites-core/constants/sites";
import { siteIntegrationsSchema } from "@notra/sites-core/schemas/site-integrations";

import {
  discardSiteDraft,
  listSiteDrafts,
  readSiteSourceFile,
  saveSiteDraft,
} from "./editor";
import type {
  SaveSiteIntegrationsInput,
  SiteIntegrationsState,
} from "./types/integrations";
import type { Site } from "./types/sites";
import { defaultSiteConfigContent } from "./utils/default-config";
import { isRecord } from "./utils/json";
import {
  parseSiteIntegrationConfig,
  updateSiteIntegrationConfig,
} from "./utils/site-integration-config";

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

export async function readSiteIntegrations(
  site: Site
): Promise<SiteIntegrationsState> {
  const { content, draft } = await currentConfig(site);
  const config = parseSiteIntegrationConfig(content);
  return {
    integrations: isRecord(config?.integrations) ? config.integrations : {},
    hasDraft: Boolean(draft),
    invalid:
      config === null ||
      !siteIntegrationsSchema.safeParse(config.integrations).success,
  };
}

export async function saveSiteIntegration(
  site: Site,
  input: SaveSiteIntegrationsInput
): Promise<SiteIntegrationsState> {
  const { file, draft, content } = await currentConfig(site);
  const { integrations, content: next } = updateSiteIntegrationConfig(
    content,
    input
  );
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
    return { integrations, hasDraft: false, invalid: false };
  }
  await saveSiteDraft(site, {
    ...observed,
    content: next,
    baseBlobSha: draft ? draft.baseBlobSha : (file?.sha ?? null),
    baseCommitSha: draft?.baseCommitSha ?? null,
    userId: input.userId,
  });
  return { integrations, hasDraft: true, invalid: false };
}
