#!/usr/bin/env bash
set -eu -o pipefail

DRUPAL_DIR="${GITPOD_REPO_ROOT}/drupal"

# Set up Drupal website
cd "$DRUPAL_DIR" && ddev drupal-install
