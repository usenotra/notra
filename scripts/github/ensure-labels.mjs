import { labels } from "./constants/labels.mjs";
import { github, paginate } from "./utils/github.mjs";

const existing = new Set(
  (await paginate("labels")).map((label) => label.name.toLowerCase())
);
for (const label of labels) {
  if (existing.has(label.name.toLowerCase())) {
    continue;
  }
  try {
    await github("labels", "POST", label);
    console.log(`Created ${label.name}`);
  } catch (error) {
    // Another PR run may have created the same label after our initial list.
    if (error.status !== 422) {
      throw error;
    }
    await github(`labels/${encodeURIComponent(label.name)}`);
  }
}
