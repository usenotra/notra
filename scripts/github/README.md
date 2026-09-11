# PR triage

The `PR triage` workflow runs once when a same-repository PR is opened, including
draft PRs. Commits, title/description edits, reopening, and marking ready for review
do not trigger another scan. Labels describe the initial PR and are not refreshed
automatically as its scope changes. Forks and
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
If the head/base commit, title, or description changes during the model call, the
run skips label writes; manually label that PR instead.

Area labels are limited to app and package workspaces and reflect directly changed
paths, including both sides of renames; they do not infer downstream package
consumers. Generic `.github` and `scripts` area labels are not used. CI/CD, GitHub
Actions, PR automation, and supporting scripts use `type/ci`, including when they
introduce new automation capabilities. Edit `constants/labels.mjs` when adding
workspaces. Priority means review urgency, not change size or deployment risk.
Existing type/priority labels always win, including those from earlier bot runs.
To change a classification later, edit the labels manually. A maintainer can
explicitly retry the initial run from Actions; retries are skipped if the PR head
has changed since the original event.
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
