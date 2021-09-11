#!/usr/bin/env bash
set -eu -o pipefail

CONTENTA_DIR="${GITPOD_REPO_ROOT}/contenta"

# Set up DDEV
cd "$GITPOD_REPO_ROOT" && .gitpod/ddev-setup.sh

# Setup Contenta
echo "\$settings['config_sync_directory'] = 'profiles/contrib/contenta_jsonapi/config/sync';" >> "$CONTENTA_DIR/web/sites/default/settings.php"
cd "$CONTENTA_DIR" && ddev drush si -y --account-pass=admin --site-name='quickstart-druxt-site-contenta' contenta_jsonapi

# Setup Druxt
cd "$CONTENTA_DIR" && ddev composer require drupal/druxt && ddev drush -y en druxt
cd "$CONTENTA_DIR" && ddev drush "rap anonymous 'access druxt resources'"
cd "$CONTENTA_DIR" && ddev drush cdel jsonapi_extras.jsonapi_resource_config.entity_form_display--entity_form_display
cd "$CONTENTA_DIR" && ddev drush cdel jsonapi_extras.jsonapi_resource_config.entity_form_mode--entity_form_mode
cd "$CONTENTA_DIR" && ddev drush cdel jsonapi_extras.jsonapi_resource_config.entity_view_display--entity_view_display
cd "$CONTENTA_DIR" && ddev drush cdel jsonapi_extras.jsonapi_resource_config.entity_view_mode--entity_view_mode
cd "$CONTENTA_DIR" && ddev drush cdel jsonapi_extras.jsonapi_resource_config.field_config--field_config
cd "$CONTENTA_DIR" && ddev drush cdel jsonapi_extras.jsonapi_resource_config.jsonapi_resource_config--jsonapi_resource_config
cd "$CONTENTA_DIR" && ddev drush cdel jsonapi_extras.jsonapi_resource_config.view--view
cd "$CONTENTA_DIR" && ddev drush cr
