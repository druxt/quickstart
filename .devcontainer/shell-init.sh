#!/usr/bin/env bash
# Sourced by ~/.bashrc inside the dev container. post-create.sh installs the
# line that sources it, so a fresh container gets both halves below.

# The host's locale arrives over SSH: OpenSSH sends LANG and LC_* by default,
# and DevPod's shell inherits them. When the value names a locale this image
# has not generated, every command warns "setlocale: cannot change locale"
# and manpath gives up. Fall back to the image's UTF-8 locale instead.
if [ -n "${LANG:-}" ] && ! locale -a 2>/dev/null | grep -qix "$(printf '%s' "$LANG" | sed 's/UTF-8$/utf8/')"; then
  export LANG=C.UTF-8
  unset LC_ALL LC_CTYPE LC_COLLATE LC_MESSAGES LC_MONETARY LC_NUMERIC LC_TIME
fi

# The rest is for a person at a prompt.
case $- in *i*) ;; *) return 0 2>/dev/null || exit 0 ;; esac

backend="not started"
if [ -f "${WORKSPACE_ROOT:-$PWD}/.env" ]; then
  backend="$(sed -n 's/^BASE_URL=//p' "${WORKSPACE_ROOT:-$PWD}/.env" | head -1)"
  backend="${backend:-not started}"
fi

cat <<EOF

Druxt Quickstart
  Backend:  ${backend}
  Frontend: http://localhost:3000 once \`npm run dev\` is running

  npm run dev      Nuxt dev server against the backend
  npm run info     Backend details and versions
  npm run login    One-time Drupal login link
  npm run stop     Stop the backend
  make help        Everything else

EOF
