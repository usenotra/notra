# PR triage

The `PR triage` workflow uses `pull_request` for same-repository PRs. Forks and
Dependabot runs are skipped because they lack the required secret/write token.
It checks out only scripts from the same-repository PR head SHA, installs no
dependencies, and fetches changed files through GitHub's API. Contributors who
can push branches in this repository are trusted to modify the workflow/scripts;
fork code is never run. This also lets the initial PR test the new scripts.

Add `OPENAI_API_KEY` in repository Settings → Secrets and variables → Actions.
The workflow sends the PR title, description, filenames, and bounded patches to
OpenAI's `gpt-5.6-luna`, with no tools and response storage disabled. Without the
secret, path labeling still runs and adds `needs-triage`. API errors, incomplete
file lists, invalid model output, and uncertain classifications also require triage.

Area labels reflect directly changed paths, including both sides of renames; they
do not infer downstream package consumers. Edit `constants/labels.mjs` when adding
workspaces. Priority means review urgency, not change size or deployment risk.
Existing type/priority labels always win, including those from earlier bot runs.
To reclassify, remove those labels and edit the PR description to trigger a run.
Other labels are preserved; area labels and `needs-triage` are managed by the bot.
Reasons appear in workflow logs. No PR comments are posted.

The workflow creates missing labels automatically without changing existing label
colors/descriptions. To run just that step locally with GitHub CLI authentication:

```sh
GITHUB_REPOSITORY=owner/repo GITHUB_TOKEN="$(gh auth token)" node scripts/github/ensure-labels.mjs
```

The token needs repository label-write access. No OpenAI key is needed for this
script. The workflow grants `issues: write` to create labels and
`pull-requests: write` to apply them.
