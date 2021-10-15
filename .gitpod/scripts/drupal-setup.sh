#!/usr/bin/env bash
set -eu -o pipefail

DRUPAL_DIR="${GITPOD_REPO_ROOT}/drupal"

# Set up Drupal website
cd "$DRUPAL_DIR" && ddev composer install
cd "$DRUPAL_DIR" && ddev drush si -y --account-pass=admin --site-name='quickstart-druxt-site' standard
cd "$DRUPAL_DIR" && ddev drush -y en druxt
cd "$DRUPAL_DIR" && ddev drush "rap anonymous 'access druxt resources'"
cd "$DRUPAL_DIR" && ddev drush -y config:set jsonapi.settings read_only 0
