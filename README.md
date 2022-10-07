# Druxt Quickstart

> One click, fully Decoupled Drupal with DruxtJS.

Druxt Quickstart provides a Drupal and Nuxt mono-repo to get you started with DruxtJS power decoupled Drupal development.

This repostory provides a quickstart installation of:
- Drupal 9
- Nuxt 2
- Druxt 0

## Quick-er-start

Try it before you fork it:

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/druxt/quickstart)


## Theme branches

Start quicker with a pre-installed UI Framework.

- [BootstrapVue](https://github.com/druxt/quickstart/tree/theme/bootstrap-vue)
- [TailwindCSS](https://github.com/druxt/quickstart/tree/theme/tailwindcss)


## Getting started

### Local development with [DDev](https://ddev.readthedocs.io)

1. Click the **Use this template** button in GitHub and follow the on-screen instructions to **Create a new repository**.

2. Clone the repository locally.

   Example: `git clone git@github.com:druxt/quickstart.git`

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


### Cloud development with [Gitpod.io](https://gitpod.io)

1. Click the **Use this template** button in GitHub and follow the on-screen instructions to **Create a new repository**.

2. Once the repository has been generated, open it in Gitpod by appending `https://gitpod.io#` to the GitHub url.

   Example: `https://gitpod.io#github.com/druxt/quickstart`

   _Note:_ If this is your first time using Gitpod, you can signup for a free plan with your Github account.

3. Wait for your codebase to build.

   _Note:_ To speed up this step, enable Prebuilds by follow the instructions @ https://www.gitpod.io/docs/prebuilds#enable-prebuilt-workspaces


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
