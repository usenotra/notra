import {
  PREVIEW_COMMENT_TITLES,
  UNCHANGED_BUILD_TITLE,
} from "../constants/github";
import type { DeploymentOutcome, SiteDeployment } from "../types/deployments";
import type { Site } from "../types/sites";
import { primaryMountUrl } from "./urls";

export function previewCommentBody(
  site: Site,
  deployment: SiteDeployment,
  buildUrl: string,
  outcome?: DeploymentOutcome
): string {
  let status = outcome
    ? PREVIEW_COMMENT_TITLES[outcome.kind]
    : "⏳ Building preview";
  if (outcome?.kind === "skipped" && deployment.status === "skipped") {
    status = `⏭️ ${UNCHANGED_BUILD_TITLE}`;
  }
  const links = [`[View build](<${buildUrl}>)`];
  const previewAvailable =
    outcome?.kind === "live" ||
    (outcome?.kind === "skipped" && deployment.status === "skipped");
  if (previewAvailable) {
    const url = primaryMountUrl(
      deployment.target.publicOrigin,
      deployment.target.mounts
    );
    links.unshift(`[Open preview](<${url}>)`);
  }
  return [
    `<!-- notra-preview:${site.id} -->`,
    `### Notra · ${site.slug} preview`,
    `${status} · Commit \`${deployment.commitSha.slice(0, 7)}\``,
    links.join(" · "),
    ...(outcome?.kind === "skipped" ? [outcome.reason] : []),
    ...(previewAvailable && site.previewVisibility === "protected"
      ? [
          site.previewPassword
            ? "This preview is protected. Sign in to Notra or use the preview password."
            : "This preview is protected. Sign in to Notra to open it.",
        ]
      : []),
  ].join("\n\n");
}
