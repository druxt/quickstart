#!/usr/bin/env bash

# Misc housekeeping before start
ddev config global --instrumentation-opt-in=true

# Start ddev
cd $DRUPAL_DIR && ddev start
