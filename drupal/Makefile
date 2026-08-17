SHELL=/bin/bash

WEBSERVER_HOST ?= 127.0.0.1
WEBSERVER_PORT ?= 8888
DB_FILE ?= /tmp/quickstart-drupal-site.sqlite

.PHONY: build assemble provision start stop info describe drush login debug reset delete destroy

help:
	@echo "COMMANDS"
	@echo "========"
	@echo "build           - Assemble, provision, and start (full local setup)."
	@echo "assemble        - Install Composer dependencies."
	@echo "provision       - Install the site (SQLite + druxt/simple_oauth + OAuth Consumer)."
	@echo "start           - Start the PHP built-in development server."
	@echo "stop            - Stop the development server."
	@echo "info            - Print a read-only summary of the current environment (alias: describe)."
	@echo "drush           - Run a Drush command."
	@echo "login           - Run Drush uli (one-time login link)."
	@echo "debug           - Enable PHP XDebug step-debugging for the development server."
	@echo "reset           - Stop the server and wipe the throwaway database (aliases: delete, destroy)."

# Sequential on purpose: provision needs vendor/ (assemble) and start
# needs a provisioned site - `make -j build` must not interleave them.
build:
	$(MAKE) stop && $(MAKE) assemble && $(MAKE) provision && $(MAKE) start

assemble:
	./.devtools/assemble

provision:
	./.devtools/provision

start:
	./.devtools/start

stop:
	./.devtools/stop

info:
	@./.devtools/info

# DDEV uses `describe` for the equivalent of our `info`. Kept as an alias for
# muscle memory coming from DDEV.
describe: info

# Enable PHP XDebug step-debugging by restarting the PHP server with
# `-d xdebug.mode=debug -d xdebug.start_with_request=yes`. Run `make start`
# to disable.
debug:
	@[ "$$(./.devtools/info xdebug)" = "enabled" ] && echo "XDebug is already enabled. Run 'make start' to disable." || \
		(XDEBUG=1 ./.devtools/start && sleep 1 && [ "$$(./.devtools/info xdebug)" = "enabled" ] && echo "Enabled XDebug. Run 'make start' to disable." || (echo "Failed to enable XDebug." && exit 1))

# Allow running Drush commands with `make drush <command>`.
ifeq (drush,$(firstword $(MAKECMDGOALS)))
  DRUSH_RUN_ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
  $(eval $(DRUSH_RUN_ARGS):;@:)
endif

drush:
	vendor/bin/drush -r $(CURDIR)/web $(DRUSH_RUN_ARGS)

login:
	vendor/bin/drush -r $(CURDIR)/web uli

# DDEV uses `delete` and Lando uses `destroy` for what our `reset` does.
delete destroy: reset

reset: stop
	rm -f $(DB_FILE) /tmp/quickstart-drupal-php-server.log /tmp/quickstart-drupal-php-server.pid > /dev/null 2>&1 || true

.DEFAULT_GOAL := build
