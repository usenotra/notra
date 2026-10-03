import { createHash } from "node:crypto";

import {
  DEMO_GITHUB_BRANCHES,
  DEMO_GITHUB_COMMITS,
  DEMO_GITHUB_DISABLED_MESSAGE,
  DEMO_GITHUB_FILES,
  DEMO_GITHUB_PULLS,
  DEMO_GITHUB_RELEASES,
} from "@notra/ai/constants/demo-github";

const DAY_MS = 86_400_000;
const REPO_PATH = /^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/;
const CONTENTS_PATH = /^\/contents(?:\/(.*))?$/;
const EDGE_SLASHES = /^\/+|\/+$/g;
const DEMO_FILE_SIZE_BYTES = 2048;

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

/** A stable, fake git object id so entries look like real GitHub ones. */
function fakeSha(seed: string): string {
  return createHash("sha1").update(seed).digest("hex");
}

/** The default branch points at the newest commit; the rest get fake ids. */
function branches(owner: string, name: string) {
  return DEMO_GITHUB_BRANCHES.map((branch, index) => {
    const sha = index === 0 ? DEMO_GITHUB_COMMITS[0].sha : fakeSha(branch);
    return {
      name: branch,
      commit: {
        sha,
        url: `https://api.github.com/repos/${owner}/${name}/commits/${sha}`,
      },
      protected: index === 0,
    };
  });
}

function contentEntry(
  owner: string,
  name: string,
  path: string,
  type: "dir" | "file"
) {
  const view = type === "dir" ? "tree" : "blob";
  return {
    type,
    name: path.split("/").at(-1) ?? path,
    path,
    sha: fakeSha(path),
    size: type === "file" ? DEMO_FILE_SIZE_BYTES : 0,
    url: `https://api.github.com/repos/${owner}/${name}/contents/${path}`,
    html_url: `https://github.com/${owner}/${name}/${view}/main/${path}`,
    download_url:
      type === "file"
        ? `https://raw.githubusercontent.com/${owner}/${name}/main/${path}`
        : null,
  };
}

/**
 * `GET /repos/{owner}/{repo}/contents/{path}`: a file answers with its entry,
 * a folder with its direct children, anything else is a 404.
 */
function contents(owner: string, name: string, rawPath: string): Response {
  const path = decodeURIComponent(rawPath).replace(EDGE_SLASHES, "");
  if ((DEMO_GITHUB_FILES as readonly string[]).includes(path)) {
    return json({
      ...contentEntry(owner, name, path, "file"),
      content: "",
      encoding: "base64",
    });
  }
  const prefix = path ? `${path}/` : "";
  const children = new Map<string, "dir" | "file">();
  for (const file of DEMO_GITHUB_FILES) {
    if (!file.startsWith(prefix)) {
      continue;
    }
    const [child = "", ...nested] = file.slice(prefix.length).split("/");
    children.set(`${prefix}${child}`, nested.length > 0 ? "dir" : "file");
  }
  if (children.size === 0) {
    return json({ message: "Not Found" }, 404);
  }
  return json(
    [...children].map(([childPath, type]) =>
      contentEntry(owner, name, childPath, type)
    )
  );
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
  if (rest === "/branches") {
    return json(branches(owner, name));
  }
  const contentsMatch = CONTENTS_PATH.exec(rest);
  if (contentsMatch) {
    return contents(owner, name, contentsMatch[1] ?? "");
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
