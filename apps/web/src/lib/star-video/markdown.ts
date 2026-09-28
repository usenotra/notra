import { markdownSection } from "@/utils/markdown";
import { SITE_URL } from "@/utils/urls";

const REPO_STAR_VIDEO_URL = `${SITE_URL}/repo-star-video`;

export function buildRepoStarVideoMarkdown() {
  return [
    "# GitHub Star Video Generator",
    "",
    "Drop in any repo and get a share-ready video that counts up your GitHub stars, with the whole stargazer crowd in the room.",
    "",
    "Turn any GitHub repository into a celebratory star-count video, with real stargazer avatars and confetti. Free, no sign-up.",
    "",
    markdownSection("How it works", [
      "1. Enter a repository as `owner/name`.",
      "2. Connect GitHub so the generator can load the repository's stargazers.",
      "3. Pick a background color and preview the video.",
      "4. Download the rendered video.",
      "",
      `You can prefill the repository with the \`repo\` query parameter, for example ${REPO_STAR_VIDEO_URL}?repo=usenotra/notra.`,
    ]),
  ].join("\n");
}
