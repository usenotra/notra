import {
  createAgentSession,
  getErrorMessage,
  type RepoImageBox,
  RepoImageError,
  type RepoImageFormatRunner,
} from "@notra/ai/agents/repo-image-agent";
import {
  DIAGRAM_SPEC_PATH,
  MIN_DIAGRAM_SPEC_BYTES,
} from "@notra/ai/constants/excalidraw-diagram";
import {
  AGENT_TIMEOUT_MS,
  IMAGE_REVIEW_MODEL_ID,
  RECOVERY_AGENT_TIMEOUT_MS,
} from "@notra/ai/constants/repo-image";
import { gateway } from "@notra/ai/gateway";
import {
  buildDiagramExtractionPrompt,
  buildDiagramMissingOutputPrompt,
  buildDiagramReviewPrompt,
  buildDiagramRevisionPrompt,
} from "@notra/ai/prompts/diagram-assets";
import { withRouterDefaults } from "@notra/ai/provider-options";
import { diagramReviewSchema } from "@notra/ai/schemas/excalidraw-diagram";
import type { RenderedDiagram } from "@notra/ai/types/excalidraw-diagram";
import type { RepoImageSourceContext } from "@notra/ai/types/repo-image";
import {
  describeDiagramSpecError,
  isDiagramSpecError,
} from "@notra/ai/utils/excalidraw-diagram";
import { findDiagramLayoutIssues } from "@notra/ai/utils/excalidraw-layout-check";
import { renderDiagramSpec } from "@notra/ai/utils/excalidraw-render";
import { withBoxRetry } from "@notra/ai/utils/repo-image-box";
import { injectExcalidrawDiagramSkill } from "@notra/ai/utils/repo-image-skills";
import { logInfo, logWarn } from "@notra/ai/utils/server-log";
import { generateText, Output } from "ai";

const RENDER_RECOVERY_ATTEMPTS = 2;

type DiagramOutcome =
  | { rendered: RenderedDiagram; raw: string }
  | { error: string | undefined };

async function readAndRenderDiagram(
  box: RepoImageBox
): Promise<DiagramOutcome> {
  const check = await withBoxRetry(() =>
    box.exec.command(
      `test -f ${DIAGRAM_SPEC_PATH} && test "$(wc -c < ${DIAGRAM_SPEC_PATH})" -ge ${MIN_DIAGRAM_SPEC_BYTES} && echo ok || echo incomplete`
    )
  );
  if (check.result.trim() !== "ok") {
    return { error: undefined };
  }
  const raw = await withBoxRetry(() => box.files.read(DIAGRAM_SPEC_PATH));
  try {
    return { rendered: await renderDiagramSpec(raw), raw };
  } catch (error) {
    if (!isDiagramSpecError(error)) {
      throw error;
    }
    return { error: describeDiagramSpecError(error) };
  }
}

async function reviewRenderedDiagram(params: {
  pngBase64: string;
  source: RepoImageSourceContext;
  organizationId: string;
}) {
  const { output } = await generateText({
    model: gateway(IMAGE_REVIEW_MODEL_ID, {
      organizationId: params.organizationId,
    }),
    output: Output.object({ schema: diagramReviewSchema }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildDiagramReviewPrompt({ source: params.source }),
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
      { gateway: { tags: ["content-diagram-review"] } },
      { modelId: IMAGE_REVIEW_MODEL_ID }
    ),
  });

  return output;
}

/**
 * What the diagram still needs after it renders: deterministic geometry
 * problems first, and the vision review only for a layout that passes them.
 */
async function findRevisionPrompt(params: {
  rendered: RenderedDiagram;
  source: RepoImageSourceContext;
  organizationId: string;
}) {
  const layoutIssues = findDiagramLayoutIssues(params.rendered.scene);
  logInfo("[repo-image] Diagram layout check", {
    issueCount: layoutIssues.length,
    issues: layoutIssues,
  });
  if (layoutIssues.length > 0) {
    return `Fix these layout problems and change nothing else:\n- ${layoutIssues.join("\n- ")}`;
  }

  try {
    const review = await reviewRenderedDiagram({
      pngBase64: params.rendered.pngBase64,
      source: params.source,
      organizationId: params.organizationId,
    });
    if (review.needsRevision && review.revisionPrompt) {
      logInfo("[repo-image] Diagram review requested revision", {
        reason: review.reason,
      });
      return review.revisionPrompt;
    }
  } catch (error) {
    logWarn("[repo-image] Diagram review skipped after error", {
      error: getErrorMessage(error),
    });
  }
  return null;
}

export const diagramFormat: RepoImageFormatRunner = {
  async prepare({ box, restoreSnapshotId, restoreDiagramSpec }) {
    await injectExcalidrawDiagramSkill({ box });
    // Hand and chat edits happen outside the sandbox, so the snapshot can
    // hold an older diagram.json than the post.
    if (restoreSnapshotId && restoreDiagramSpec) {
      await withBoxRetry(() =>
        box.files.write({
          path: DIAGRAM_SPEC_PATH,
          content: JSON.stringify(restoreDiagramSpec, null, 2),
        })
      );
    }
  },

  async run({ box, input, repository, source, restoreSnapshotId }) {
    const agent = createAgentSession(box);
    await agent.run({
      prompt: restoreSnapshotId
        ? buildDiagramRevisionPrompt({ prompt: input.prompt ?? "" })
        : buildDiagramExtractionPrompt({
            owner: repository.owner,
            repo: repository.repo,
            branch: input.branch,
            source,
          }),
      timeout: AGENT_TIMEOUT_MS,
      label: restoreSnapshotId ? "diagram-revision" : "diagram-initial",
      allowTimeout: !restoreSnapshotId,
    });

    let outcome = await readAndRenderDiagram(box);
    for (
      let attempt = 1;
      !("rendered" in outcome) && attempt <= RENDER_RECOVERY_ATTEMPTS;
      attempt++
    ) {
      logWarn("[repo-image] Diagram not renderable; running recovery attempt", {
        error: outcome.error ?? "missing",
        attempt,
        maxAttempts: RENDER_RECOVERY_ATTEMPTS,
      });
      await agent.run({
        prompt: buildDiagramMissingOutputPrompt(outcome.error),
        timeout: RECOVERY_AGENT_TIMEOUT_MS,
        label: `diagram-recovery-${attempt}`,
        allowTimeout: true,
      });
      outcome = await readAndRenderDiagram(box);
    }
    if (!("rendered" in outcome)) {
      throw new RepoImageError(
        "agent_failed",
        `Agent did not produce a renderable ${DIAGRAM_SPEC_PATH}${outcome.error ? `: ${outcome.error}` : ""}`
      );
    }

    let { rendered } = outcome;
    const revisionPrompt = await findRevisionPrompt({
      rendered,
      source,
      organizationId: input.organizationId,
    });
    if (revisionPrompt) {
      await agent.run({
        prompt: buildDiagramRevisionPrompt({ prompt: revisionPrompt }),
        timeout: RECOVERY_AGENT_TIMEOUT_MS,
        label: "diagram-review-revision",
        allowTimeout: true,
      });
      const revised = await readAndRenderDiagram(box);
      if ("rendered" in revised) {
        ({ rendered } = revised);
      } else {
        // Keep the version that renders, and put it back so later revisions
        // start from a file that renders.
        logWarn(
          "[repo-image] Diagram review revision not renderable; keeping previous diagram",
          { error: revised.error ?? "missing" }
        );
        const { raw } = outcome;
        await withBoxRetry(() =>
          box.files.write({ path: DIAGRAM_SPEC_PATH, content: raw })
        );
      }
    }

    return {
      html: rendered.html,
      svg: rendered.svg,
      pngBase64: rendered.pngBase64,
      excalidrawScene: rendered.scene,
      diagramSpec: rendered.spec,
      usage: agent.usage,
    };
  },
};
