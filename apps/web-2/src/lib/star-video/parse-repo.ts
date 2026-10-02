const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);
const SLUG_PART = /^[\w.-]+$/;
const GIT_SUFFIX = /\.git$/i;
const HAS_SCHEME = /^https?:\/\//i;
const CONTAINS_GITHUB_PATH = /(^|\.)github\.com\//i;

function extractOwnerRepo(raw: string): string | null {
  if (!(HAS_SCHEME.test(raw) || CONTAINS_GITHUB_PATH.test(raw))) {
    return raw;
  }

  let url: URL;
  try {
    url = new URL(HAS_SCHEME.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  if (!GITHUB_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }
  return `${segments[0]}/${segments[1]}`;
}

export function parseRepoInput(
  raw: string
): { owner: string; repo: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const ownerRepo = extractOwnerRepo(trimmed);
  if (!ownerRepo) {
    return null;
  }

  const [owner, repo] = ownerRepo.split("/");
  if (!(owner && repo)) {
    return null;
  }

  const cleanRepo = repo.replace(GIT_SUFFIX, "");
  if (!(SLUG_PART.test(owner) && SLUG_PART.test(cleanRepo))) {
    return null;
  }

  return { owner, repo: cleanRepo };
}
