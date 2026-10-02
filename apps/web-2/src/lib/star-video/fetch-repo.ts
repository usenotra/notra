import type { RepoStarData } from "@/types/star-video";

export async function fetchRepoStarData(
  owner: string,
  repo: string,
  signal: AbortSignal
) {
  try {
    const response = await fetch(
      `/api/star-video/repo?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
      { signal }
    );
    if (!response.ok) {
      const json: { error?: string } = await response.json().catch(() => ({}));
      return {
        data: null,
        error: json.error ?? "Could not load that repository.",
      };
    }

    const data: RepoStarData = await response.json();
    return { data, error: null };
  } catch {
    return {
      data: null,
      error: "Something went wrong loading that repository.",
    };
  }
}
