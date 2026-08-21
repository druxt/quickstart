# Druxt Quickstart

[![CI](https://github.com/druxt/quickstart/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/druxt/quickstart/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/druxt/quickstart/branch/develop/graph/badge.svg)](https://codecov.io/gh/druxt/quickstart)

> One click, fully Decoupled Drupal with DruxtJS.

Druxt Quickstart provides a Drupal and Nuxt mono-repo to get you started with DruxtJS power decoupled Drupal development.

This repository includes:

- Drupal 11
- Nuxt 2
- Druxt 1

## Quickstart

```bash
npx giget@1 gh:druxt/quickstart#develop my-druxt-site --install
cd my-druxt-site
npm run dev
```

`--install` runs the full setup automatically: frontend, Composer, and a
local Drupal 11 + SQLite backend. It needs PHP 8.3 or newer and Composer
on `PATH`. Without them it installs the frontend only, prints the next
steps and still exits cleanly, so the install never fails on a machine
that cannot run the backend.

The `@1` is deliberate. giget 2 and newer call `fetch`, which needs Node
18, and this site runs on [Node 16](.nvmrc) - an unpinned `giget@latest`
fails there with `fetch is not defined`. giget 1 bundles a fetch
polyfill, so one Node version covers both the download and the site.

Prefer to start from your own repository? Use the GitHub
[Use this template](https://github.com/druxt/quickstart/generate) button,
then clone the repository it creates.

## Themed starts

The `theme/bootstrap-vue` and `theme/tailwindcss` branches are frozen on a
2022 version of this starterkit and do not include the Drupal 11 work.

They are being replaced with reusable theme packages - see
[#143](https://github.com/druxt/quickstart/issues/143) to follow progress.

## Getting started

Requires [Node 16](.nvmrc) and one of:

- PHP 8.3 or newer (with the pdo_sqlite extension) + Composer on your
  machine (Drush comes with the backend - no global install needed), or
- [DDEV](https://ddev.readthedocs.io) or [Lando](https://lando.dev) (Docker)

On Windows, use the [dev container](#development-container-vs-code-codespaces-devpod),
WSL2, or a container backend - see [Windows](#windows).

[nvm](https://github.com/nvm-sh/nvm) or [mise](https://mise.jdx.dev/) users:
`nvm use` / `mise install` provides the pinned versions.

### One-command setup (local PHP + SQLite, no Docker)

1. Create your repository from this template (or clone it), then from
   the repository root:

   ```bash
   npm run setup
   ```

   This installs the frontend dependencies, provisions Drupal with
   Druxt, Simple OAuth and an OAuth Consumer (SQLite, throwaway), starts
   the backend, and writes `BASE_URL` + `OAUTH_CLIENT_ID` to `.env`.

   `make setup` works too, as do `make dev`, `make login`, `make info`,
   `make reset`, etc.

2. Start developing:

   ```bash
   npm run dev
   ```

   - Drupal backend: http://127.0.0.1:8888
   - Nuxt frontend: http://localhost:3000 (or the next free port up to
     3009, which it prints)
   - One-time Drupal login: `npm run login`

`npm run dev` and `npm run start` automatically start the local backend
if it is not already running, and leave external backends alone.

Other commands: `npm run stop`, `npm run reset` (fresh site), `npm run
info`, `npm run login`, `npm run devtools -- <script>` for direct access
to `drupal/.devtools/`. See `drupal/.devtools/README.md` for what each
backend script does.

### Local development with [DDEV](https://ddev.readthedocs.io)

Using DDEV? Keep `BASE_URL` as the `*.ddev.site` URL in `.env`
(`cp .env.example .env` gives you that). Then:

1. Frontend (from repository root):

   ```bash
   npm run setup
   ```

   Detecting the DDEV `BASE_URL`, this installs the frontend only and
   prints the backend steps.

2. Backend (from `drupal/`):

   ```bash
   ddev start
   ddev drupal-install
   ddev druxt-add-consumer
   ```

   `druxt-add-consumer` prints `OAUTH_CLIENT_ID=...` - copy it into
   `.env`.

3. `npm run dev` as above. The DDEV backend is never auto-started or
   auto-stopped from the npm scripts.

### Local development with [Lando](https://lando.dev)

Set `BASE_URL` in `.env` to your Lando URL
(`https://druxt-quickstart.lndo.site` for the bundled `drupal/.lando.yml`).
Then:

1. Frontend (from repository root):

   ```bash
   npm run setup
   ```

   Any non-loopback `BASE_URL` is treated as a backend this repo does not
   manage, so this installs the frontend only.

2. Backend (from `drupal/`):

   ```bash
   lando start
   lando drupal-install
   lando druxt-add-consumer
   ```

   `druxt-add-consumer` prints `OAUTH_CLIENT_ID=...` - copy it into
   `.env`. Both commands run the same install steps as their DDEV
   counterparts.

3. `npm run dev` as above. `npm run drush -- <command>` is proxied
   through `lando drush`.

### Troubleshooting

#### Port 3000 is already in use

`npm run dev` takes the next free port between 3000 and 3009 and says
which one it picked. Provisioning registers an OAuth callback for every
port in that range, so login keeps working on whichever one it uses.

Naming a port yourself turns that off: `PORT=3005 npm run dev` uses
3005 or fails, because a port you asked for is a decision rather than a
default. If the whole range is busy, `npm run dev` says so instead of
letting Nuxt fall back to a random port and break login.

A port outside 3000-3009 has no registered callback, so `npm run dev`
refuses that too. To use one, set `OAUTH_CALLBACK` in `.env` to
`http://localhost:<port>/callback` and re-run `npm run provision`.

#### Login fails with invalid_client in a dev container

The browser builds the OAuth callback from its own address. An IDE
forwarding container port 3000 uses the next free host port when 3000 is
taken (3001, 3002, ...), and Drupal rejects an unregistered callback as
`invalid_client`. Provisioning registers `localhost:3000-3009/callback`
to absorb this - if forwarding assigns a port outside that range, free
up host ports or re-provision with a matching `OAUTH_CALLBACK`.

### Windows

The local PHP backend does not run on Windows directly: it manages a PHP
built-in server with `nohup`, `lsof`, `ps` and `kill`, and generates
OAuth keys through OpenSSL. `npm run setup` says so rather than failing
part-way through.

Any of these work instead, with no changes to the repository:

- the [dev container](#development-container-vs-code-codespaces-devpod),
- WSL2, running the same commands inside your Linux distribution,
- [DDEV](#local-development-with-ddev) or [Lando](#local-development-with-lando),
  setting `BASE_URL` to the container URL.

### Development Container (VS Code, Codespaces, DevPod)

`.devcontainer/devcontainer.json` gives you a ready environment: Node
16, PHP 8.4, Composer, and `mise` (config pre-trusted), provisioned
through `drupal/.devtools` (PHP built-in server + SQLite) - no
Docker-in-Docker needed.

[![Open in DevPod!](https://devpod.sh/assets/open-in-devpod.svg)](https://devpod.sh/open#https://github.com/druxt/quickstart)

| Tool                        | How                                                                                                                                                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VS Code                     | Clone, open the folder, run **Dev Containers: Reopen in Container**                                                                                                                                                        |
| GitHub Codespaces           | On the repository page: **Code → Open with Codespaces**                                                                                                                                                                    |
| [DevPod](https://devpod.sh) | Click the badge above, run `devpod up https://github.com/druxt/quickstart` (CLI), or add the same URL as a workspace source in DevPod's desktop app - all three read this same `devcontainer.json`, no extra config needed |

First open runs `npm install` at the repository root, which triggers
the same full setup pipeline as [Quickstart](#quickstart) above:
frontend dependencies, Composer, a provisioned Drupal backend, and the
backend started and ready. Then:

```bash
npm run dev
```

- Drupal backend: http://127.0.0.1:8888
- Nuxt frontend: http://localhost:3000 (or the next free port up to 3009)

## How to use it

Your environment contains a pre-installed, pre-configured and running instance of Drupal and Nuxt, with the DruxtSite module enabled.

In a Development Container (VS Code, Codespaces, DevPod), forwarded ports are accessible via your editor's **Ports** panel, or Codespaces' own URL pattern for forwarded ports.

## Services

| Port   | Service                                                                               |
| ------ | ------------------------------------------------------------------------------------- |
| `3000` | Nuxt.js (3000-3009: `npm run dev` takes the first free one)                           |
| `3003` | Storybook                                                                             |
| `8888` | Drupal (local `.devtools` backend - DDEV serves at its own `*.ddev.site` URL instead) |

## Tools

### DDEV

> DDEV is an open-source tool that makes it dead simple to get local PHP development environments up and running within minutes.

DDEV is used to manage the Drupal instance, and provides a CLI that can be used to run common drupal tasks, including `ddev drush`.

These commands should be run from within the `/drupal` folder.

Refer to the documentation for more details: https://ddev.readthedocs.io

### Lando

> Lando is a free, open-source development tool that allows developers to
> easily specify and construct the exact environment they need to build
> their applications.

- [lando.dev](https://lando.dev)
- Config: [drupal/.lando.yml](drupal/.lando.yml)

### @nuxtjs/auth-next

> Zero-boilerplate authentication support for Nuxt.js!

The @nuxtjs/auth-next module is installed and configured to connect to the Drupal Simple OAuth module by way of the DruxtAuth module:

```js
this.$auth.loginWith('drupal-authorization_code')
```

- More details on how to use the `$auth` service can be found at https://auth.nuxtjs.org/api/auth

### @nuxtjs/storybook

> Storybook integration with NuxtJS .

Druxt integrates with the Nuxt Storybook module to provide zero-configuration, auto-discovery stories with access to live data from your Drupal backend.

To start Storybook, navigate to the `nuxt` directory and run `npx nuxt storybook`.

## License

[MIT](https://github.com/druxt/druxt.js/blob/develop/LICENSE)
