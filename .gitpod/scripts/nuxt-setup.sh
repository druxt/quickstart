#!/usr/bin/env bash

# Set up Druxt for use on gitpod

set -eu -o pipefail

DRUXT_DIR="${GITPOD_REPO_ROOT}/nuxt"

# Set up Nuxt
cd "$DRUXT_DIR" && echo "BASE_URL=$(gp url 8080)" > .env
cd "$DRUXT_DIR" && npm i
