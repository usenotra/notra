import {
  MERCH_CLAIM_STEPS,
  MERCH_GALLERY_IMAGES,
  MERCH_PHOTO_CREDIT,
  MERCH_SPEC_ROWS,
  MERCH_TWEET_IDS,
} from "@/constants/merch";
import { markdownSection } from "@/utils/markdown";
import { SITE_URL } from "@/utils/urls";

const CONTACT_MARKDOWN_URL = `${SITE_URL}/contact.md`;

export function buildFreeHatMarkdown() {
  const photos = MERCH_GALLERY_IMAGES.map(
    (image) => `- [${image.alt}](${SITE_URL}${image.src})`
  );
  const specs = MERCH_SPEC_ROWS.map((row) => `- ${row.label}: ${row.value}`);
  const steps = MERCH_CLAIM_STEPS.flatMap((step) => [
    `### ${step.number}. ${step.title}`,
    step.body,
    "",
  ]);
  const tweets = MERCH_TWEET_IDS.map((id) => `- https://x.com/i/status/${id}`);

  return [
    "# Free hat? No, Cap!",
    "",
    "The Notra Classic Hat, a thank-you for building with us. If your workspace is on a paid plan, it's yours. Reach out and we'll put one in the mail.",
    "",
    "Paid workspaces only, free trials don't count. US shipping for now.",
    "",
    `[Claim your gift](${CONTACT_MARKDOWN_URL})`,
    "",
    markdownSection("Photos", [...photos, "", MERCH_PHOTO_CREDIT]),
    markdownSection("Just a good hat", [
      "Unstructured cotton twill, one size, the Notra mark on the front. That's it.",
      "",
      ...specs,
    ]),
    markdownSection("How to claim your gift", [
      "No checkout, no shipping fees. If you're on a paid plan, just ask.",
      "",
      ...steps,
      "The Classic Hat is a gift for paid Notra customers, not a free-trial promotion. On a trial? You can't claim one yet. Upgrade to any paid plan, reach out, and we'll send one your way. US shipping only for now.",
    ]),
    markdownSection("Spotted in the wild", tweets),
    markdownSection("Consider it a gift", [
      "One Classic Hat per paid workspace, shipped free anywhere in the US. Tell us where to send it.",
      "",
      `[Claim your gift](${CONTACT_MARKDOWN_URL})`,
    ]),
  ].join("\n");
}
