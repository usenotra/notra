import {
  DEMO_GITHUB_COMMITS,
  DEMO_GITHUB_DISABLED_MESSAGE,
  DEMO_GITHUB_PULLS,
  DEMO_GITHUB_RELEASES,
} from "@notra/ai/constants/demo-github";

const DAY_MS = 86_400_000;
const REPO_PATH = /^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/;

function ago(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function repo(owner: string, name: string) {
  return {
    id: 7_000_001,
    name,
    full_name: `${owner}/${name}`,
    owner: { login: owner },
    private: true,
    default_branch: "main",
    html_url: `https://github.com/${owner}/${name}`,
  };
}

function commits(owner: string, name: string) {
  return DEMO_GITHUB_COMMITS.map((commit, index) => ({
    sha: commit.sha,
    html_url: `https://github.com/${owner}/${name}/commit/${commit.sha}`,
    commit: {
      message: commit.message,
      author: { name: commit.author, date: ago(commit.daysAgo) },
    },
    author: { login: commit.author.toLowerCase().split(" ")[0] },
    stats: { additions: 40 + index * 13, deletions: 8 + index * 3 },
  }));
}

function pulls(owner: string, name: string) {
  return DEMO_GITHUB_PULLS.map((pull) => ({
    number: pull.number,
    title: pull.title,
    body: pull.body,
    state: "closed",
    merged_at: ago(pull.daysAgo),
    closed_at: ago(pull.daysAgo),
    created_at: ago(pull.daysAgo + 2),
    html_url: `https://github.com/${owner}/${name}/pull/${pull.number}`,
    user: { login: pull.author },
    labels: pull.labels.map((label) => ({ name: label })),
  }));
}

function releases() {
  return DEMO_GITHUB_RELEASES.map((release) => ({
    tag_name: release.tag,
    name: release.name,
    body: release.body,
    published_at: ago(release.daysAgo),
    draft: false,
    prerelease: false,
  }));
}

/**
 * GitHub for the public demo: a fetch that answers the read endpoints the
 * content agents use with a fictional Fieldnote repository and refuses every
 * write. It never touches the network.
 */
export const demoGitHubFetch: typeof fetch = async (input, init) => {
  const url = new URL(
    typeof input === "string" || input instanceof URL ? input : input.url
  );
  const method = (init?.method ?? "GET").toUpperCase();
  if (method !== "GET") {
    return json({ message: DEMO_GITHUB_DISABLED_MESSAGE }, 403);
  }
  if (url.pathname === "/user") {
    return json({ login: "fieldnote-bot", id: 7_000_000 });
  }
  const match = REPO_PATH.exec(url.pathname);
  if (!match) {
    return json({ message: "Not Found" }, 404);
  }
  const [, owner = "fieldnote", name = "fieldnote-app", rest = ""] = match;
  if (rest === "") {
    return json(repo(owner, name));
  }
  if (rest === "/commits") {
    return json(commits(owner, name));
  }
  if (rest.startsWith("/commits/")) {
    return json(commits(owner, name)[0]);
  }
  if (rest === "/pulls") {
    return json(pulls(owner, name));
  }
  if (rest.startsWith("/pulls/")) {
    const number = Number(rest.split("/")[2]);
    const pull = pulls(owner, name).find((item) => item.number === number);
    return pull ? json(pull) : json({ message: "Not Found" }, 404);
  }
  if (rest === "/releases") {
    return json(releases());
  }
  if (rest === "/releases/latest") {
    return json(releases()[0]);
  }
  if (rest.startsWith("/compare/")) {
    return json({ commits: commits(owner, name), files: [] });
  }
  if (rest.startsWith("/branches/") || rest.startsWith("/git/ref/")) {
    return json({
      name: "main",
      ref: "refs/heads/main",
      object: { sha: DEMO_GITHUB_COMMITS[0]?.sha ?? "0" },
      commit: { sha: DEMO_GITHUB_COMMITS[0]?.sha ?? "0" },
    });
  }
  return json({ message: "Not Found" }, 404);
};
