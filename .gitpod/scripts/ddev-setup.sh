#!/usr/bin/env bash

DRUPAL_DIR="${GITPOD_REPO_ROOT}/drupal"

# Misc housekeeping before start
ddev config global --instrumentation-opt-in=true

# Start ddev
cd $DRUPAL_DIR && ddev start
