Local development without Docker. Just PHP, Composer, and SQLite.

Use this as an alternative to DDEV, not a replacement. Pick whichever fits your workflow.

## Scripts

| Script | What it does |
| --- | --- |
| `assemble` | Install Composer dependencies. |
| `provision` | Install Drupal fresh. Enable `druxt` and `simple_oauth`. Generate OAuth keys. Create a Consumer. |
| `start` | Start the PHP dev server. Write `BASE_URL` and `OAUTH_CLIENT_ID` to `../.env`. |
| `stop` | Stop the dev server. |
| `info` | Show the current environment: PHP, Drupal, Composer, and Drush versions, webserver, database. |
| `seed-test-content` | Create one published Article node. Used by the Cypress e2e suite (`nuxt/cypress/e2e/content.cy.js`), not part of `provision` - a fresh install is meant to be empty. |
| `helpers.php` | Shared functions the scripts above use. |
| `etc/php.ini` | Raises `memory_limit`. Drupal installs need more than PHP's 128M default. |

## Quick start

```bash
cd drupal
.devtools/assemble
.devtools/provision
.devtools/start
```

Then start the Nuxt frontend:

```bash
cd ../nuxt
npm install
npm run dev
```

Or with `make` (see the `Makefile` in this directory's parent):

```bash
make build   # assemble + provision + start
make stop
make reset   # wipe the database and stop the server
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `WEBSERVER_HOST` | `127.0.0.1` | PHP server bind host |
| `WEBSERVER_PORT` | auto-discovered (8888+) | PHP server port |
| `DB_FILE` | `/tmp/quickstart-drupal-site.sqlite` | SQLite database path |
| `OAUTH_CALLBACK` | `http://localhost:3000/callback` | OAuth Consumer redirect URL |
| `XDEBUG` | unset | Set to any value to enable Xdebug |
