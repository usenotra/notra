---
name: pr-workflow
description: Git workflow for pushing code and opening pull requests on GitHub. ALWAYS use this before you git push, push to a remote, open or create a pull request, raise a PR, or "ship" code. Covers confirming the user actually asked to push, cutting a Conventional-Commits feature branch off main, writing a Conventional-Commit PR title, and using the repo's .github PR template as the body. Use whenever the user says push, ship, open/create a PR, raise a pull request, or commit-and-push.
---

## Workflow

1. **Confirm the user asked — in their latest message.** Pushing to a remote /
   opening a PR is outward-facing and hard to undo. Do it only when the user's
   *most recent* request actually says to push, ship, or open a PR. Approval
   from an earlier turn does **not** carry forward — "make the change" is not
   "push it." If you finished work and the user didn't ask to push, **stop and
   ask.** Never push proactively.

2. **Branch off the default branch.** Unless the user explicitly says to push
   straight to main (e.g. "commit straight to main", "push to main directly"),
   create a feature branch named with Conventional Commits:
   `<type>/<kebab-description>`, e.g. `feat/add-logout-button`.

3. **Commit with a Conventional Commit message**, then push the branch.
   **Always make a new commit.** Never force-push (`git push --force` /
   `--force-with-lease`) and never amend (`git commit --amend`) or otherwise
   rewrite existing commits — unless the user explicitly asks for it in their
   latest message. To update a PR or fix a previous commit, add another commit
   and push normally.

4. **Open the PR** with a Conventional-Commit title
   (`<type>[(scope)][!]: <subject>`, e.g. `feat(auth): add OAuth login`). For the
   body: if a `.github` PR template exists, use it **verbatim** and add **no**
   extra sections, summaries, or "test plan" fields. If there's no template,
   keep the body to a one-line description — don't invent a template.

`type` is one of: `feat fix docs style refactor perf test build ci chore revert`.

## Notes

- **Default branch:** the base for the PR is the repo's default branch — read it
  from `origin/HEAD`, falling back to `main`.
- **Branch names:** lowercase the description, replace spaces and punctuation
  with dashes, prefix the type — `"Add Login (OAuth)"` with type `feat` →
  `feat/add-login-oauth`.
- **Finding the PR template:** check `.github/PULL_REQUEST_TEMPLATE.md` first,
  then the lowercase variant, then the repo root, then `docs/`. The
  `.github/PULL_REQUEST_TEMPLATE/` directory form holds multiple templates — if
  the repo uses it, pass the chosen file to `gh pr create --body-file`.
- **Opening the PR:** `gh pr create --base <default-branch> --title "<conventional
  title>"` with `--body-file <template>` when a template exists, or a one-line
  `--body` when it doesn't.

## Gotchas

- **"The user asked earlier" is not the latest message.** Step 1 is about the
  *most recent* request. If it was "fix the bug" and you fixed it, you have
  **not** been asked to push. Ask first.
- **A PR template is not a checklist for you to fill in.** Use it verbatim as
  the body; leave its checkboxes/headings exactly as written unless the user
  fills them. Stacking your own "## Summary / ## Test plan" on top of an
  existing template is wrong.
- **Never rewrite history to "clean up."** Force-pushing and amending are
  destructive and break anyone who pulled the branch. Even when a previous
  commit was wrong, the default is a new follow-up commit, *not* an amend or
  force-push. Only rewrite when the user explicitly tells you to in their
  latest message.
- **The template lookup checks `.github` first**, then the repo root, then
  `docs/`, and includes the `.github/PULL_REQUEST_TEMPLATE/` directory form
  (multiple templates). If the repo has several, ask which to use.

## Troubleshooting

- `gh pr create` fails with `no default remote repository` → run
  `gh repo set-default <owner>/<repo>` once, or pass `--repo <owner>/<repo>`.
- `gh: not authenticated` → the user must run `gh auth login` themselves
  (suggest they type `! gh auth login`). Don't authenticate for them.
