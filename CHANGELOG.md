# Changelog

All notable changes to this starterkit.

**The version tracks Druxt, which is still pre-1.0** (`druxt` 0.24.0,
`druxt-site` 0.14.3). A starterkit numbered above the framework it
builds on would claim a stability neither has, so this stays on 0.x
until Druxt reaches 1.0.

While it does, the usual 0.x reading applies:

- **Minor** - anything that changes the setup you would follow, up to
  and including a Drupal major. Breaking changes are called out under
  their own heading; on 0.x the minor is where they live.
- **Patch** - fixes and dependency updates that leave the documented
  setup alone.

## 0.3.0 (2026-08-20)

A full modernization: Drupal 11, a local backend that needs no Docker,
and a one-command install.

Breaking for anyone following the old setup, which on 0.x is what a
minor is for.

### Breaking changes

- Drupal 9 to **Drupal 11.4.5**, with the Druxt ecosystem modules on
  their D11-compatible releases (druxt 1.2.1, decoupled_router 2.0.6,
  simple_oauth 6.x, jsonapi_menu_items, jsonapi_views).
- The Gitpod and CircleCI configuration is gone, replaced by a dev
  container and GitHub Actions / GitLab CI.
- Drupal 11's `standard` profile no longer creates content types, so
  Article and Page arrive as core recipes applied during provisioning.
  A site built from the old template has them already; a fresh install
  needs the recipe step.

### Features

- **One-command setup.** `npm install` on a fresh checkout provisions
  everything, which is what makes
  `npx giget gh:druxt/quickstart my-site --install` deliver a running
  backend and frontend rather than an empty package. The same pipeline
  is available as `npm run setup`.
- **A Docker-free local backend** in `drupal/.devtools/`: Composer
  install, a SQLite site install, the OAuth consumer, and a PHP built-in
  server, driven by `assemble`, `provision`, `start`, `stop` and `info`.
  PHP and Composer are the only requirements.
- **Dev container** support for VS Code, Codespaces and DevPod, which
  sets the site up on create.
- **[Lando](https://lando.dev) as a backend option** alongside DDEV, with
  `lando drupal-install` and `lando druxt-add-consumer` running the same
  scripts the DDEV commands do.
- **Lifecycle commands** through npm, `make` and `mise`, including
  `npm run drush -- <command>` proxied to whichever backend is
  configured, and `npm run xdebug` to restart the backend with step
  debugging.
- **Windows guidance**: the local backend cannot run there, so setup says
  so immediately and names the routes that do work, instead of failing
  part way through key generation.
- **Test coverage**: end-to-end tests that provision a real backend and
  drive the built frontend, a test of the documented `giget` install
  path, guard-rail tests for machines without PHP, container environment
  tests for DDEV, Lando and the dev container, and unit tests for the
  setup scripts.
- **A lint suite** - ESLint, Prettier, cspell, markdownlint, knip,
  commitlint and Vale - so the starterkit holds itself to the practices
  it demonstrates.

### Bug fixes

- Druxt modules moved from `buildModules` to `modules`. `buildModules`
  are not loaded by `nuxt start`, so the proxy and authentication
  registrations vanished in production while the dev server looked fine.
- The OAuth consumer is created with the fields Simple OAuth 6 actually
  reads. It looks consumers up by `client_id` rather than uuid, and
  requires `grant_types`, but enforces both only through the entity
  form - so a programmatic save produced a consumer that could not
  authenticate, and login failed with `invalid_client`, then
  `unsupported_grant_type`. The consumer is now validated before saving.
- Provisioning creates an OAuth2 scope and sets it as the consumer
  default. Simple OAuth 6 ships none and rejects every authorization
  request until one exists, with or without a `scope` parameter.
- The consumer registers callbacks for ports 3000-3009. A browser builds
  its redirect URI from its own address, and an IDE forwarding the
  frontend port lands on the next free host port, which Drupal then
  rejected as an unregistered callback.
- Setup runs one at a time. A dev container attaches while its
  post-create setup is still installing, and a second setup started from
  that terminal corrupted `vendor/` and `node_modules/`.
- `composer install` retries: a transient registry error no longer ends
  a first run.
- The dev server moves to the next free port between 3000 and 3009 when
  3000 is taken, and prints which one it took. Nuxt's own fallback picks a
  random port, which silently breaks the OAuth callback; every port in
  that range has a callback registered, so any of them is safe. A `PORT`
  you name is still yours - a busy one fails, rather than moving
  somewhere you did not ask for.
- The dev server refuses a port with no registered OAuth callback. A
  `PORT` outside 3000-3009 that `OAUTH_CALLBACK` does not name started
  fine and then failed only at login, since the browser builds its
  callback from the port it is on. Backends this repo did not provision
  are left alone: their consumers were registered out of sight.
- The dev container no longer leaves Xdebug active, which made every
  `php` and `composer` call wait for a debugger.
- The druxt patch is described without a link to a private merge
  request. composer-patches prints descriptions during
  `composer install`, so every install showed a patch justified by a URL
  the reader could not open. `npm run lint:private` now fails the build
  on any tracked file referencing a host that resolves only on a private
  network.

### Dependencies

- GitHub Actions on v7: `actions/checkout`, `actions/setup-node`,
  `actions/upload-artifact` and `codecov/codecov-action`.
- Nuxt dependencies: core-js 3.50.0, dotenv 17, Cypress 15,
  start-server-and-test 3, stylelint 14.16.1,
  stylelint-config-standard 29 and @nuxtjs/eslint-config 12.
- Dependabot no longer files version updates. Renovate covers the same
  four ecosystems and carries the auto-merge policy, so every bump was
  arriving twice. Dependabot security alerts are unaffected.

### Known limitations

- Nuxt 2 and Node 16 are both end of life. This starterkit is pinned to
  them because Druxt targets Nuxt 2; the Nuxt 3 story is separate work.
- The `theme/bootstrap-vue` and `theme/tailwindcss` branches are frozen
  on the 2022 template and are no longer linked from the README. See
  [#143](https://github.com/druxt/quickstart/issues/143).
- Coverage reported by Codecov understates the suite: tests that run the
  scripts in a child process do not contribute to it.

## 0.2.0 (2022-10-14)

### Features

- Added authentication through
  [DruxtAuth](https://github.com/druxt/druxt-auth) and Simple OAuth.
- Added the `theme/bootstrap-vue` and `theme/tailwindcss` branches,
  regenerated from `develop` by a workflow.
- Added example components and Storybook.
- Added GitHub Actions, and `cweagans/composer-patches` for patched
  dependencies.
- Switched the default Drupal theme to Olivero.

### Bug fixes

- Fixed the Gitpod `.env` setup.
- Fixed a DDEV MTU problem on some networks.
- Pinned dependencies so builds stopped drifting.

## 0.1.0 (2021-10-20)

The first version of the starterkit: a Drupal 9 and Nuxt 2 mono-repo
with DDEV and Gitpod for local development.
