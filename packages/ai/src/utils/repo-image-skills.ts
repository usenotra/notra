import {
  ASSET_KIND_FILENAME_PREFIX,
  BRAND_IDENTITY_ASSET_DIR,
  BRAND_IDENTITY_GUIDELINES_PATH,
  BRAND_IDENTITY_SKILL_DIR,
  BRAND_IDENTITY_SKILL_PATH,
  BRAND_REFERENCE_CONTENT_LIMIT,
  BRAND_REFERENCE_LIMIT,
  FRONTMATTER_START_REGEX,
  HUMANIZER_SKILL_DIR,
  HUMANIZER_SKILL_PATH,
  LEADING_DOT_REGEX,
  LINE_SPLIT_REGEX,
  PATH_EXTENSION_REGEX,
  SCREENSHOT_FILENAME_PREFIX,
  URL_QUERY_OR_HASH_REGEX,
} from "@notra/ai/constants/repo-image-skills";
import { db } from "@notra/db/drizzle";
import {
  brandGuidelineAssets,
  brandGuidelineColors,
  brandGuidelineFonts,
  brandGuidelineScreenshots,
  brandGuidelines,
  brandGuidelineTokens,
  brandReferences,
  brandSettings,
  skills,
} from "@notra/db/schema";
import type { Box } from "@upstash/box";
import { and, asc, desc, eq } from "drizzle-orm";
import { Data, Effect } from "effect";

import { formatBrandGuidelineSourceInstructions } from "./brand-guideline-source";
import { withBoxRetry } from "./repo-image-box";

type RepoImageBox = Awaited<ReturnType<typeof Box.create>>;

class RepoImageSkillInjectionError extends Data.TaggedError(
  "RepoImageSkillInjectionError"
)<{
  readonly operation: string;
  readonly cause: unknown;
}> {}

function toSkillInjectionError(operation: string) {
  return (cause: unknown) =>
    new RepoImageSkillInjectionError({ operation, cause });
}

export async function injectBrandIdentitySkill(params: {
  box: RepoImageBox;
  organizationId: string;
  brandIdentityId?: string;
}) {
  return Effect.runPromise(injectBrandIdentitySkillEffect(params));
}

export async function injectHumanizerSkill(params: {
  box: RepoImageBox;
  organizationId: string;
}) {
  await Effect.runPromise(injectHumanizerSkillEffect(params));
}

const injectBrandIdentitySkillEffect = Effect.fn("injectBrandIdentitySkill")(
  function* (params: {
    box: RepoImageBox;
    organizationId: string;
    brandIdentityId?: string;
  }) {
    const skill = yield* Effect.tryPromise({
      try: () =>
        buildBrandIdentitySkillContent({
          organizationId: params.organizationId,
          brandIdentityId: params.brandIdentityId,
        }),
      catch: toSkillInjectionError("load brand identity skill"),
    });

    if (!skill) {
      return null;
    }

    yield* writeSandboxSkillEffect({
      box: params.box,
      dir: BRAND_IDENTITY_SKILL_DIR,
      path: BRAND_IDENTITY_SKILL_PATH,
      content: skill.content,
    });
    yield* writeSandboxTextFileEffect({
      box: params.box,
      dir: BRAND_IDENTITY_SKILL_DIR,
      path: BRAND_IDENTITY_GUIDELINES_PATH,
      content: skill.guidelines,
    });
    yield* downloadSandboxAssetsEffect({
      box: params.box,
      assets: skill.assets,
    });

    return skill.brandIdentityId;
  }
);

const injectHumanizerSkillEffect = Effect.fn("injectHumanizerSkill")(
  function* (params: { box: RepoImageBox; organizationId: string }) {
    const skill = yield* Effect.tryPromise({
      try: () =>
        db.query.skills.findFirst({
          where: and(
            eq(skills.organizationId, params.organizationId),
            eq(skills.name, "humanizer")
          ),
        }),
      catch: toSkillInjectionError("load humanizer skill"),
    });

    if (!skill) {
      return;
    }

    yield* writeSandboxSkillEffect({
      box: params.box,
      dir: HUMANIZER_SKILL_DIR,
      path: HUMANIZER_SKILL_PATH,
      content: renderSandboxSkillContent(skill),
    });
  }
);

function writeSandboxSkillEffect(params: {
  box: RepoImageBox;
  dir: string;
  path: string;
  content: string;
}) {
  return writeSandboxTextFileEffect(params);
}

function writeSandboxTextFileEffect(params: {
  box: RepoImageBox;
  dir: string;
  path: string;
  content: string;
}) {
  const encoded = Buffer.from(params.content, "utf8").toString("base64");
  return Effect.tryPromise({
    try: () =>
      withBoxRetry(() =>
        params.box.exec.command(
          `mkdir -p ${params.dir} && printf '%s' '${encoded}' | base64 -d > ${params.path}`
        )
      ),
    catch: toSkillInjectionError(`write sandbox skill file ${params.path}`),
  });
}

function downloadSandboxAssetsEffect(params: {
  box: RepoImageBox;
  assets: { path: string; url: string }[];
}) {
  if (params.assets.length === 0) {
    return Effect.void;
  }

  const commands = params.assets
    .map(
      (asset) =>
        `curl -L --fail --silent --show-error --max-time 30 -o ${shellQuote(
          asset.path
        )} ${shellQuote(asset.url)}`
    )
    .join("\n");

  return Effect.tryPromise({
    try: () =>
      withBoxRetry(() =>
        params.box.exec.command(
          `mkdir -p ${BRAND_IDENTITY_ASSET_DIR}\n${commands}`
        )
      ),
    catch: toSkillInjectionError("download brand identity assets"),
  });
}

function renderSandboxSkillContent(skill: typeof skills.$inferSelect) {
  const content = skill.content.trim();
  if (FRONTMATTER_START_REGEX.test(content)) {
    return `${content}\n`;
  }

  return `---
name: ${JSON.stringify(skill.name)}
description: ${JSON.stringify(skill.description.trim())}
---

${content}
`;
}

async function buildBrandIdentitySkillContent(params: {
  organizationId: string;
  brandIdentityId?: string;
}) {
  const identity = params.brandIdentityId
    ? await db.query.brandSettings.findFirst({
        where: and(
          eq(brandSettings.id, params.brandIdentityId),
          eq(brandSettings.organizationId, params.organizationId)
        ),
      })
    : await db.query.brandSettings.findFirst({
        where: eq(brandSettings.organizationId, params.organizationId),
        orderBy: [desc(brandSettings.isDefault), desc(brandSettings.createdAt)],
      });

  if (!identity) {
    return null;
  }

  const references = await db.query.brandReferences.findMany({
    where: eq(brandReferences.brandSettingsId, identity.id),
    orderBy: [desc(brandReferences.createdAt)],
    limit: BRAND_REFERENCE_LIMIT,
  });
  const guideline = await db.query.brandGuidelines.findFirst({
    where: eq(brandGuidelines.brandSettingsId, identity.id),
    with: {
      assets: { orderBy: [asc(brandGuidelineAssets.sortOrder)] },
      colors: { orderBy: [asc(brandGuidelineColors.sortOrder)] },
      fonts: { orderBy: [asc(brandGuidelineFonts.sortOrder)] },
      screenshots: { orderBy: [asc(brandGuidelineScreenshots.sortOrder)] },
      tokens: { orderBy: [asc(brandGuidelineTokens.sortOrder)] },
    },
  });

  const assetDownloads = [
    ...(guideline?.assets.map((asset) => ({
      label: `${asset.kind} ${asset.variant}`,
      path: `${BRAND_IDENTITY_ASSET_DIR}/${ASSET_KIND_FILENAME_PREFIX}-${asset.kind}-${asset.variant}.${extensionForAsset(asset)}`,
      url: asset.url,
    })) ?? []),
    ...(guideline?.screenshots.map((screenshot) => ({
      label: `${screenshot.kind} screenshot`,
      path: `${BRAND_IDENTITY_ASSET_DIR}/${SCREENSHOT_FILENAME_PREFIX}-${screenshot.kind}.${extensionForAsset(screenshot)}`,
      url: screenshot.url,
    })) ?? []),
  ];

  const fields = [
    ["Brand identity id", identity.id],
    ["Identity name", identity.name],
    ["Default identity", identity.isDefault ? "Yes" : "No"],
    ["Website URL", identity.websiteUrl],
    ["Company name", identity.companyName],
    ["Company description", identity.companyDescription],
    ["Tone profile", identity.toneProfile],
    ["Custom tone", identity.customTone],
    ["Custom instructions", identity.customInstructions],
    ["Audience", identity.audience],
    ["Language", identity.language],
  ]
    .map(([label, value]) => `- ${label}: ${formatSkillValue(value)}`)
    .join("\n");

  const referenceSection =
    references.length === 0
      ? "No saved writing references are attached to this brand identity."
      : references
          .map((reference, index) => {
            const note = reference.note?.trim()
              ? `\nNote:\n${toMarkdownQuote(reference.note)}\n`
              : "";
            return `### Reference ${index + 1}\n\n- Type: ${reference.type}\n- Applies to: ${reference.applicableTo.join(", ")}${note}\nContent:\n${toMarkdownQuote(truncateReference(reference.content))}`;
          })
          .join("\n\n");

  const guidelines = `# Notra Brand Guidelines

This file was generated by Notra from the selected brand identity and its latest brand guideline records.

## Selected Brand Identity

${fields}

## Visual Guidelines

${renderGuidelineSection(guideline, assetDownloads)}

## Saved Brand References

${referenceSection}
`;

  const content = `---
name: brand-identity
description: Apply the selected Notra brand identity, brand guidelines, downloaded logo/image assets, colors, fonts, tokens, screenshots, and saved reference material injected from the Notra database for this sandbox run.
---

# Notra Brand Identity

This skill was generated by Notra for this sandbox. It contains the selected brand identity, generated brand guidelines, and downloaded visual assets from the database.

## How To Use This Skill

- Read \`brand-guidelines.md\` before choosing copy, colors, fonts, layout, or imagery.
- Inspect \`assets/\` and use those downloaded files before searching the cloned repo or external logo sources.
- Treat the brand identity below as the publishing identity for this image.
- Apply the colors, typography, design tokens, logo/wordmark files, and screenshots from the generated guidelines when they are present.
- Use repository, PR, commit, and file data only as factual source material.
- Match the brand's company context, audience, tone, language, and custom instructions.
- Use saved references as style evidence: vocabulary, rhythm, structure, emphasis, and what the brand avoids.
- Do not copy distinctive reference lines verbatim into new image text.
- If source names differ from the brand identity, keep the selected brand identity and frame source data as contributions, integrations, fixes, or relevant product work.

## Required Reference

Open and follow \`brand-guidelines.md\`. Downloaded brand images and screenshots are available in \`assets/\`.
`;

  return {
    assets: assetDownloads.map(({ path, url }) => ({ path, url })),
    brandIdentityId: identity.id,
    content,
    guidelines,
  };
}

function formatSkillValue(value: unknown) {
  if (typeof value !== "string") {
    return value === null || value === undefined ? "Not set" : String(value);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Not set";
}

function truncateReference(value: string) {
  if (value.length <= BRAND_REFERENCE_CONTENT_LIMIT) {
    return value;
  }

  return `${value.slice(0, BRAND_REFERENCE_CONTENT_LIMIT).trimEnd()}\n[Truncated]`;
}

function toMarkdownQuote(value: string) {
  return value
    .trim()
    .split(LINE_SPLIT_REGEX)
    .map((line) => `> ${line}`)
    .join("\n");
}

function renderGuidelineSection(
  guideline:
    | (typeof brandGuidelines.$inferSelect & {
        assets: (typeof brandGuidelineAssets.$inferSelect)[];
        colors: (typeof brandGuidelineColors.$inferSelect)[];
        fonts: (typeof brandGuidelineFonts.$inferSelect)[];
        screenshots: (typeof brandGuidelineScreenshots.$inferSelect)[];
        tokens: (typeof brandGuidelineTokens.$inferSelect)[];
      })
    | undefined,
  assetDownloads: { label: string; path: string; url: string }[]
) {
  if (!guideline) {
    return "No generated visual brand guidelines are available for this identity yet.";
  }

  return [
    `- Guideline status: ${guideline.status}`,
    `- Last generated at: ${formatSkillValue(guideline.lastGeneratedAt?.toISOString())}`,
    "",
    "### Colors",
    renderList(
      guideline.colors.map((color) =>
        [
          `${color.role}${color.name ? ` (${color.name})` : ""}`,
          `light ${color.lightValue}`,
          color.darkValue ? `dark ${color.darkValue}` : null,
          color.usage ? `usage: ${color.usage}` : null,
        ]
          .filter(Boolean)
          .join(" - ")
      ),
      "No brand colors were detected."
    ),
    "",
    "### Typography",
    renderList(
      guideline.fonts.map((font) =>
        [
          `${font.role}: ${font.family}`,
          font.weight ? `weight ${font.weight}` : null,
          font.size ? `size ${font.size}` : null,
          font.lineHeight ? `line-height ${font.lineHeight}` : null,
          font.source ? `source: ${font.source}` : null,
        ]
          .filter(Boolean)
          .join(" - ")
      ),
      "No brand typography was detected."
    ),
    "",
    "### Design Tokens",
    renderList(
      guideline.tokens.map((token) =>
        [
          `${token.type}: ${token.name} = ${token.value}`,
          token.source ? `source: ${token.source}` : null,
        ]
          .filter(Boolean)
          .join(" - ")
      ),
      "No spacing, radius, shadow, or component tokens were detected."
    ),
    "",
    "### Uploaded Guideline Document",
    formatBrandGuidelineSourceInstructions(guideline.sourcePdfText) ||
      "No brand guideline PDF has been uploaded.",
    "",
    "### Downloaded Assets",
    renderList(
      assetDownloads.map((asset) => `${asset.label}: \`${asset.path}\``),
      "No brand assets or screenshots were downloaded."
    ),
  ].join("\n");
}

function renderList(items: string[], fallback: string) {
  if (items.length === 0) {
    return fallback;
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function extensionForAsset(asset: {
  format: string | null;
  mimeType?: string | null;
  url: string;
}) {
  if (asset.format?.trim()) {
    return asset.format.trim().replace(LEADING_DOT_REGEX, "").toLowerCase();
  }
  if (asset.mimeType) {
    const subtype = asset.mimeType.split("/")[1]?.split(";")[0]?.trim();
    if (subtype) {
      return subtype === "jpeg" ? "jpg" : subtype.toLowerCase();
    }
  }
  return extensionFromAssetUrl(asset.url) ?? "png";
}

function extensionFromAssetUrl(url: string) {
  try {
    return new URL(url).pathname
      .match(PATH_EXTENSION_REGEX)?.[1]
      ?.toLowerCase();
  } catch {
    return url
      .replace(URL_QUERY_OR_HASH_REGEX, "")
      .match(PATH_EXTENSION_REGEX)?.[1]
      ?.toLowerCase();
  }
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
