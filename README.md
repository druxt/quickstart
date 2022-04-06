# DruxtSite quickstart - Drupal

> One click, Fully Decoupled Drupal Site starter-kit with Druxt.

DruxtSite connects Drupal to Nuxt via JSON:API to provide a framework for building a Fully Decoupled site.

This repostory provides a quickstart installation of:
- Drupal 9
- Nuxt 2
- DruxtSite
- DruxtAuth
- Node v16


## Quickstart

Try it before you fork it:

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/druxt/quickstart-druxt-site)


## Getting started

### Local development (ddev)

1. Click the **Use this template** button in GitHub and follow the on-screen instructions to **Create a new repository**.

2. Clone the repository locally.

   Example: `git clone git@github.com:druxt/quickstart-druxt-site.git`

3. Setup an `.env` file and update as required: `cp .env.example .env`

4. Install and setup Drupal:

   (from repository root)

   ```
   cd drupal
   ddev start
   ddev drupal-install
   ddev druxt-add-consumer
   ```

5. Install and run Nuxt:

   (from repository root)

   ```
   cd nuxt
   nvm use
   npm install
   npm run dev
   ```


### Cloud development (Gitpod.io)

1. Click the **Use this template** button in GitHub and follow the on-screen instructions to **Create a new repository**.

2. Once the repository has been generated, open it in Gitpod by appending `https://gitpod.io#` to the GitHub url.

   Example: `https://gitpod.io#github.com/druxt/quickstart-druxt-site`

   _Note:_ If this is your first time using Gitpod, you can signup for a free plan with your Github account.

3. Wait for your codebase to build.

   _Note:_ To speed up this step, enable Prebuilds by follow the instructions @ https://www.gitpod.io/docs/prebuilds#enable-prebuilt-workspaces

## Getting started without Gitpod
If you're choosing to set up the quickstart without the use of Gitpod, make sure to setup the nuxt folder while using node v14 or node v16. You can also switch to the version of the .nvmrc file if you type `nvm use`.

## How to use it

Your environment contains a pre-install, pre-configured and running instance of Drupal and Nuxt, with the DruxtSite module enabled.

You can access the services in your browser, via the **Remote Explorer** extension, or via the URL pattern: `https://[PORT]-[GITPOD_ID].[GITPOD_SERVER].gitpod.io`


## Services

| Port | Service |
| -- | -- |
| `3000` | Nuxt.js |
| `3003` | Storybook |
| `8080` | Drupal |


## Tools

### DDEV

> DDEV is an open source tool that makes it dead simple to get local PHP development environments up and running within minutes. 

DDEV is used to manage the Drupal instance, and provides a CLI that can be used to run common drupal tasks, including `ddev drush`.

These commands should be run from within the `/drupal` folder.

Refer to the documentation for more details: https://ddev.readthedocs.io

### Lando
> It's a free, open source, cross-platform, local development environment and DevOps tool built on Docker container technology and developed by Tandem.

Lando will manage your Drupal workflow. All commands should be executed within the `/drupal` folder. For additional information on Lando: https://docs.lando.dev/getting-started/

To use Lando

- `cd ./drupal`
- `lando start`
- `drush si --db-url="mysql//drupal9:drupal9@database:3306/drupal9" minimal && drush en druxt -y`
- Visit http://druxt-quickstart.lndo.site/ in your browser

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
