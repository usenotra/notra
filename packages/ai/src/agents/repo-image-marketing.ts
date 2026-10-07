import {
  createAgentSession,
  getErrorMessage,
  type RepoImageBox,
  RepoImageError,
  type RepoImageFormatRunner,
} from "@notra/ai/agents/repo-image-agent";
import {
  AGENT_TIMEOUT_MS,
  IMAGE_GEN_AGENT_SKILLS_INSTALL_COMMAND,
  IMAGE_REVIEW_MODEL_ID,
  MIN_REPO_IMAGE_HTML_BYTES,
  RECOVERY_AGENT_TIMEOUT_MS,
  REPO_IMAGE_OUTPUT_HTML_PATH,
} from "@notra/ai/constants/repo-image";
import { gateway } from "@notra/ai/gateway";
import {
  buildMarketingAssetExtractionPrompt,
  buildMarketingAssetLogoReviewPrompt,
  buildMarketingAssetMissingOutputPrompt,
  buildMarketingAssetRevisionPrompt,
} from "@notra/ai/prompts/marketing-assets";
import { withRouterDefaults } from "@notra/ai/provider-options";
import type { RepoImageSourceContext } from "@notra/ai/types/repo-image";
import { withBoxRetry } from "@notra/ai/utils/repo-image-box";
import { renderHtmlToImages } from "@notra/ai/utils/repo-image-render";
import { logError, logInfo, logWarn } from "@notra/ai/utils/server-log";
import { generateText, Output } from "ai";
import { z } from "zod";

const DEFAULT_LOGO_REVISION_PROMPT =
  "Review the rendered image for unofficial or fabricated company logos. Replace any questionable logos with official assets from the brand-logos skill or real repo assets, or remove them if no official source is available. Preserve the current layout as much as possible.";

const logoReviewSchema = z.object({
  needsRevision: z.boolean(),
  reason: z.string().min(1),
  revisionPrompt: z.string().nullable(),
});

async function hasHtmlOutput(box: RepoImageBox) {
  const run = await withBoxRetry(() =>
    box.exec.command(
      `test -f ${REPO_IMAGE_OUTPUT_HTML_PATH} && test "$(wc -c < ${REPO_IMAGE_OUTPUT_HTML_PATH})" -ge ${MIN_REPO_IMAGE_HTML_BYTES} && echo ok || echo incomplete`
    )
  );
  return run.result.trim() === "ok";
}

async function readAndRenderHtml(box: RepoImageBox) {
  const html = await withBoxRetry(() =>
    box.files.read(REPO_IMAGE_OUTPUT_HTML_PATH)
  );
  return { html, rendered: await renderHtmlToImages(html) };
}

async function reviewLogos(params: {
  pngBase64: string;
  owner: string;
  repo: string;
  branch: string;
  source: RepoImageSourceContext;
  organizationId?: string;
}) {
  const { output } = await generateText({
    model: gateway(IMAGE_REVIEW_MODEL_ID, {
      organizationId: params.organizationId,
    }),
    output: Output.object({ schema: logoReviewSchema }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildMarketingAssetLogoReviewPrompt(params),
          },
          {
            type: "image",
            image: params.pngBase64,
            mediaType: "image/png",
          },
        ],
      },
    ],
    maxOutputTokens: 700,
    providerOptions: withRouterDefaults(
      { gateway: { tags: ["content-image-review"] } },
      { modelId: IMAGE_REVIEW_MODEL_ID }
    ),
  });

  return output;
}

export const marketingFormat: RepoImageFormatRunner = {
  async prepare({ box, restoreSnapshotId }) {
    // A restored snapshot already has them.
    if (!restoreSnapshotId) {
      await withBoxRetry(() =>
        box.exec.command(IMAGE_GEN_AGENT_SKILLS_INSTALL_COMMAND)
      );
    }
  },

  async run({ box, input, repository, source, restoreSnapshotId }) {
    const agent = createAgentSession(box);
    await agent.run({
      prompt: restoreSnapshotId
        ? buildMarketingAssetRevisionPrompt({ prompt: input.prompt ?? "" })
        : buildMarketingAssetExtractionPrompt({
            owner: repository.owner,
            repo: repository.repo,
            branch: input.branch,
            source,
          }),
      timeout: AGENT_TIMEOUT_MS,
      label: restoreSnapshotId ? "revision" : "initial",
      allowTimeout: !restoreSnapshotId,
    });

    if (!(await hasHtmlOutput(box))) {
      logWarn("[repo-image] Missing output; running recovery attempt", {
        outputPath: REPO_IMAGE_OUTPUT_HTML_PATH,
      });
      await agent.run({
        prompt: buildMarketingAssetMissingOutputPrompt(),
        timeout: RECOVERY_AGENT_TIMEOUT_MS,
        label: "recovery-1",
        allowTimeout: true,
      });
    }

    if (!(await hasHtmlOutput(box))) {
      const diag = await withBoxRetry(() =>
        box.exec.command(
          `pwd 2>&1; echo ---; ls -la 2>&1 | head -50; echo ---; find . /workspace/home -maxdepth 4 -name "output.html" 2>/dev/null`
        )
      );
      logError("[repo-image] Missing output after recovery", undefined, {
        outputPath: REPO_IMAGE_OUTPUT_HTML_PATH,
        cwdContents: diag.result,
      });
      throw new RepoImageError(
        "agent_failed",
        `Agent did not produce ${REPO_IMAGE_OUTPUT_HTML_PATH}`
      );
    }

    let { html, rendered } = await readAndRenderHtml(box);

    let review: z.infer<typeof logoReviewSchema> | null = null;
    try {
      review = await reviewLogos({
        pngBase64: rendered.pngBase64,
        owner: repository.owner,
        repo: repository.repo,
        branch: input.branch,
        source,
        organizationId: input.organizationId,
      });
    } catch (error) {
      logWarn("[repo-image] Logo review skipped after error", {
        error: getErrorMessage(error),
      });
    }

    if (review?.needsRevision) {
      logInfo("[repo-image] Logo review requested revision", {
        reason: review.reason,
      });
      await agent.run({
        prompt: buildMarketingAssetRevisionPrompt({
          prompt: review.revisionPrompt ?? DEFAULT_LOGO_REVISION_PROMPT,
        }),
        timeout: RECOVERY_AGENT_TIMEOUT_MS,
        label: "logo-review-revision",
      });
      if (!(await hasHtmlOutput(box))) {
        throw new RepoImageError(
          "agent_failed",
          `Logo review revision removed ${REPO_IMAGE_OUTPUT_HTML_PATH}`
        );
      }
      ({ html, rendered } = await readAndRenderHtml(box));
    }

    return {
      html,
      svg: rendered.svg,
      pngBase64: rendered.pngBase64,
      usage: agent.usage,
    };
  },
};
