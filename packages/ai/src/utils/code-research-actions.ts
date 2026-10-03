import {
  CODE_RESEARCH_LIST_MAX_ENTRIES,
  CODE_RESEARCH_READ_MAX_BYTES,
  CODE_RESEARCH_READ_MAX_LINES,
  CODE_RESEARCH_SEARCH_MAX_MATCHES,
  CODE_RESEARCH_SEARCH_MAX_PER_FILE,
} from "@notra/ai/constants/code-research";
import type {
  listRepositoryFilesInputSchema,
  openRepositoryInputSchema,
  readRepositoryFileInputSchema,
  repositoryHistoryInputSchema,
  searchRepositoryInputSchema,
  showRepositoryChangeInputSchema,
} from "@notra/ai/schemas/code-research-tools";
import type {
  CodeResearchTarget,
  CodeResearchWorkspace,
} from "@notra/ai/types/code-research";
import { runInCodeResearchBox } from "@notra/ai/utils/code-research-box";
import {
  assertReadableRepoPath,
  buildHistoryScript,
  buildListFilesScript,
  buildOverviewScript,
  buildReadFileScript,
  buildSearchScript,
  buildShowChangeScript,
  describeReadFailure,
  describeTarget,
  normalizeRepoPath,
  parseCommitLines,
  parseListFiles,
  parseOverview,
  parseReadFile,
  parseSearchMatches,
  parseShowChange,
  redactSecrets,
  truncateText,
} from "@notra/ai/utils/code-research-commands";
import { acquireCodeResearchWorkspace } from "@notra/ai/utils/code-research-session";
import type { z } from "zod";

const GIT_GREP_NO_MATCH_EXIT_CODE = 1;
const MISSING_MERGE_BASE_EXIT_CODE = 7;

/**
 * Who is researching: boxes are shared per session key and integration, and
 * every lookup is scoped to the organization.
 */
export interface CodeResearchScope {
  sessionKey: string;
  organizationId: string;
}

function getWorkspace(
  scope: CodeResearchScope,
  integrationId: string,
  target: CodeResearchTarget | null
): Promise<CodeResearchWorkspace> {
  return acquireCodeResearchWorkspace({
    sessionKey: scope.sessionKey,
    organizationId: scope.organizationId,
    integrationId,
    target,
  });
}

function describeWorkspace(workspace: CodeResearchWorkspace) {
  const { repository, target, headSha } = workspace.state;
  return {
    repository: `${repository.owner}/${repository.repo}`,
    checkedOut: describeTarget(target),
    headSha,
  };
}

function toTarget(
  input: z.infer<typeof openRepositoryInputSchema>
): CodeResearchTarget {
  if (input.pullRequestNumber !== undefined) {
    return { kind: "pull_request", number: input.pullRequestNumber };
  }
  if (input.commitSha) {
    return { kind: "commit", sha: input.commitSha };
  }
  if (input.branch) {
    return { kind: "branch", branch: input.branch };
  }
  return { kind: "default" };
}

export async function openRepository(
  scope: CodeResearchScope,
  input: z.infer<typeof openRepositoryInputSchema>
) {
  const workspace = await getWorkspace(
    scope,
    input.integrationId,
    toTarget(input)
  );
  const result = await runInCodeResearchBox(
    workspace.box,
    buildOverviewScript(workspace.state.headSha)
  );
  if (result.exitCode !== 0) {
    throw new Error(
      `Reading the repository overview failed: ${result.output.trim().slice(-300)}`
    );
  }
  return {
    ...describeWorkspace(workspace),
    defaultBranch: workspace.state.repository.defaultBranch,
    ...parseOverview(result.output),
  };
}

export async function listRepositoryFiles(
  scope: CodeResearchScope,
  input: z.infer<typeof listRepositoryFilesInputSchema>
) {
  const path = normalizeRepoPath(input.path);
  const workspace = await getWorkspace(scope, input.integrationId, null);
  const result = await runInCodeResearchBox(
    workspace.box,
    buildListFilesScript(workspace.state.headSha, path, input.glob)
  );
  if (result.exitCode !== 0) {
    throw new Error(
      `Listing files failed: ${result.output.trim().slice(-300)}`
    );
  }
  return {
    ...describeWorkspace(workspace),
    ...parseListFiles(
      result.output,
      path,
      CODE_RESEARCH_LIST_MAX_ENTRIES,
      input.glob
    ),
  };
}

export async function searchRepository(
  scope: CodeResearchScope,
  input: z.infer<typeof searchRepositoryInputSchema>
) {
  const path = normalizeRepoPath(input.path);
  const workspace = await getWorkspace(scope, input.integrationId, null);
  const result = await runInCodeResearchBox(
    workspace.box,
    buildSearchScript({
      sha: workspace.state.headSha,
      query: input.query,
      regex: input.regex,
      ignoreCase: input.ignoreCase,
      path,
      glob: input.glob,
      maxPerFile: CODE_RESEARCH_SEARCH_MAX_PER_FILE,
    })
  );
  if (
    result.exitCode !== 0 &&
    result.exitCode !== GIT_GREP_NO_MATCH_EXIT_CODE
  ) {
    throw new Error(`Search failed: ${result.output.trim().slice(-300)}`);
  }
  const parsed = parseSearchMatches(
    result.output,
    CODE_RESEARCH_SEARCH_MAX_MATCHES,
    workspace.state.headSha
  );
  return {
    ...describeWorkspace(workspace),
    query: input.query,
    matchCount: parsed.matches.length,
    truncated: parsed.truncated,
    matches: parsed.matches,
    ...(parsed.hiddenPaths > 0
      ? {
          note: `${String(parsed.hiddenPaths)} secret-bearing files were hidden.`,
        }
      : {}),
  };
}

export async function readRepositoryFile(
  scope: CodeResearchScope,
  input: z.infer<typeof readRepositoryFileInputSchema>
) {
  const path = normalizeRepoPath(input.path);
  if (!path) {
    throw new Error("Pass a file path, not the repository root.");
  }
  assertReadableRepoPath(path);
  const { startLine } = input;
  const maxEndLine = startLine + CODE_RESEARCH_READ_MAX_LINES - 1;
  const endLine = Math.min(input.endLine ?? maxEndLine, maxEndLine);
  if (endLine < startLine) {
    throw new Error("endLine must be greater than or equal to startLine.");
  }

  const workspace = await getWorkspace(scope, input.integrationId, null);
  const result = await runInCodeResearchBox(
    workspace.box,
    buildReadFileScript(workspace.state.headSha, path, startLine, endLine)
  );
  if (result.exitCode !== 0) {
    throw new Error(describeReadFailure(result.exitCode, path));
  }

  const parsed = parseReadFile(result.output);
  const content = truncateText(
    redactSecrets(parsed.content),
    CODE_RESEARCH_READ_MAX_BYTES
  );
  const lastLine = Math.min(endLine, parsed.totalLines);
  return {
    ...describeWorkspace(workspace),
    path,
    startLine,
    endLine: lastLine,
    totalLines: parsed.totalLines,
    hasMore: lastLine < parsed.totalLines || content.truncated,
    content: content.text,
  };
}

export async function repositoryHistory(
  scope: CodeResearchScope,
  input: z.infer<typeof repositoryHistoryInputSchema>
) {
  const path = normalizeRepoPath(input.path);
  const workspace = await getWorkspace(scope, input.integrationId, null);
  const result = await runInCodeResearchBox(
    workspace.box,
    buildHistoryScript({
      sha: workspace.state.headSha,
      limit: input.limit,
      path,
      since: input.since,
      grep: input.grep,
    })
  );
  if (result.exitCode !== 0) {
    throw new Error(
      `Reading history failed: ${result.output.trim().slice(-300)}`
    );
  }
  const commits = parseCommitLines(result.output);
  return {
    ...describeWorkspace(workspace),
    count: commits.length,
    commits,
  };
}

export async function showRepositoryChange(
  scope: CodeResearchScope,
  input: z.infer<typeof showRepositoryChangeInputSchema>
) {
  const path = normalizeRepoPath(input.path);
  const workspace = await getWorkspace(scope, input.integrationId, null);
  const result = await runInCodeResearchBox(
    workspace.box,
    buildShowChangeScript({
      sha: workspace.state.headSha,
      ref: input.ref?.trim() || null,
      defaultBranch: workspace.state.repository.defaultBranch,
      path,
    })
  );
  if (result.exitCode === MISSING_MERGE_BASE_EXIT_CODE) {
    throw new Error(
      "The fork point with the default branch is outside the cloned history. Use repository_history and show individual commits instead."
    );
  }
  if (result.exitCode !== 0) {
    throw new Error(
      `Showing the change failed: ${result.output.trim().slice(-300)}`
    );
  }
  return {
    ...describeWorkspace(workspace),
    ...parseShowChange(result.output),
  };
}
