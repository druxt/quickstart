#!/usr/bin/env bash
#
# Install the bundled quickstart-guide walkthrough extension into
# whichever VS Code-family server is attached to this container.
#
# Why not list it in customizations.vscode.extensions? That array is
# Marketplace-IDs-only - local .vsix files can't go there. And why not a
# bare `code --install-extension` in postAttachCommand? The `code` CLI
# is frequently NOT on PATH inside the container: DevPod's browser mode
# runs openvscode-server, VS Code Desktop's remote CLI lives at a
# versioned path under ~/.vscode-server, and code-server has its own
# binary. This script tries each known CLI and says what it did, so a
# missing guide is diagnosable instead of silently swallowed.
#
# Runs on every attach (postAttachCommand) - re-installing an already
# installed extension version is a fast no-op.
set -uo pipefail

VSIX="$(dirname "$0")/extensions/quickstart-guide/quickstart-guide-1.0.0.vsix"

if [ ! -f "$VSIX" ]; then
  echo "quickstart-guide: vsix not found at $VSIX - skipping" >&2
  exit 0
fi

candidates=()

# Plain `code` on PATH (some setups symlink it).
if command -v code >/dev/null 2>&1; then
  candidates+=("$(command -v code)")
fi

# VS Code Desktop attached to the container: remote CLI under a
# commit-hash directory.
for c in "$HOME"/.vscode-server/bin/*/bin/remote-cli/code; do
  [ -x "$c" ] && candidates+=("$c")
done

# DevPod browser mode / Gitpod-style: openvscode-server.
for c in "$HOME"/.openvscode-server/bin/openvscode-server "$OPENVSCODE_SERVER_ROOT/bin/openvscode-server"; do
  [ -x "$c" ] 2>/dev/null && candidates+=("$c")
done
if command -v openvscode-server >/dev/null 2>&1; then
  candidates+=("$(command -v openvscode-server)")
fi

# code-server (Coder).
if command -v code-server >/dev/null 2>&1; then
  candidates+=("$(command -v code-server)")
fi

if [ ${#candidates[@]} -eq 0 ]; then
  echo "quickstart-guide: no VS Code server CLI found (code / vscode-server remote-cli / openvscode-server / code-server) - the walkthrough extension was not installed" >&2
  exit 0
fi

for cli in "${candidates[@]}"; do
  if "$cli" --install-extension "$VSIX" >/dev/null 2>&1; then
    echo "quickstart-guide: installed via $cli"
    echo "quickstart-guide: find the walkthrough under Help > Welcome (Get Started page)"
    exit 0
  fi
done

echo "quickstart-guide: every candidate CLI failed to install $VSIX - run '<your code CLI> --install-extension $VSIX' manually" >&2
exit 0
