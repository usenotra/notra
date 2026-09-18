#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Native plugin managers install the full commands, skills, and lifecycle hooks.
codex plugin marketplace add DietrichGebert/ponytail --ref e3ba2aa6f1e6f0bc4d69eb09c9f0d0a93af56156
codex plugin add ponytail@ponytail
claude plugin marketplace add DietrichGebert/ponytail --scope project
claude plugin install ponytail@ponytail --scope project

printf '%s\n' 'OpenCode installs its pinned plugin on startup; Amp reads the committed skills.'
printf '%s\n' 'In Codex, review and trust Ponytail in /hooks, then start a new task. Restart the desktop app.'
