export const OUTPUT_TYPE_LABELS: Record<string, string> = {
  changelog: "Changelog",
  blog_post: "Blog Post",
  twitter_post: "Twitter Post",
  linkedin_post: "LinkedIn Post",
  investor_update: "Investor Update",
};

export function getOutputTypeLabel(outputType: string): string {
  return OUTPUT_TYPE_LABELS[outputType] ?? outputType;
}
