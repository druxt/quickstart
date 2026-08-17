SHELL=/bin/bash

.PHONY: help setup dev build start stop assemble provision login info reset drush

help:
	@echo "COMMANDS"
	@echo "========"
	@echo "setup      - Install frontend deps, provision Drupal (SQLite), start the backend."
	@echo "dev        - Ensure the backend is up, then run the Nuxt dev server (port 3000)."
	@echo "build      - Build the Nuxt frontend for production."
	@echo "start      - Ensure the backend is up, then serve the built frontend (port 3000)."
	@echo "stop       - Stop the local (.devtools) backend. No-op for DDEV/external backends."
	@echo "assemble   - Install Composer dependencies (backend)."
	@echo "provision  - Install the site: SQLite, druxt, simple_oauth, OAuth consumer."
	@echo "login      - Print a Drupal one-time login link."
	@echo "info       - Print a summary of the current environment."
	@echo "reset      - Stop the backend and wipe the throwaway SQLite database."
	@echo "drush      - Run a Drush command, e.g. make drush cr all."
	@echo ""
	@echo "Backend-only targets: make -C drupal help"

setup:
	npm run setup

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

stop:
	npm run stop

assemble:
	npm run assemble

provision:
	npm run provision

login:
	npm run login

info:
	npm run info

reset:
	npm run reset

# Pass arguments through to drupal/'s own drush target: make drush cr all
ifeq (drush,$(firstword $(MAKECMDGOALS)))
  DRUSH_RUN_ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
  $(eval $(DRUSH_RUN_ARGS):;@:)
endif

drush:
	$(MAKE) -C drupal drush $(DRUSH_RUN_ARGS)

.DEFAULT_GOAL := help
