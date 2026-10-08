import { TRAFFIC_REPORT_TIMEOUT_MS } from "../constants/traffic";
import type { IngestPost } from "../types/traffic";

// Reporting never fails the page: errors are logged and dropped. A 401 means
// the site's traffic token was rotated, which is expected and not logged.
export async function postToIngest(post: IngestPost): Promise<void> {
  try {
    const response = await post.fetch(post.ingestUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${post.token}`,
      },
      body: JSON.stringify(post.buildBody()),
      signal: AbortSignal.timeout(TRAFFIC_REPORT_TIMEOUT_MS),
    });
    await response.body?.cancel();
    if (!response.ok && response.status !== 401) {
      console.warn(`sites.${post.kind}_rejected`, { status: response.status });
    }
  } catch (error) {
    console.warn(`sites.${post.kind}_failed`, { error: String(error) });
  }
}
