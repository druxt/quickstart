# DruxtSite quickstart - Drupal

> One click, Fully Decoupled Drupal Site starter-kit with Druxt.

DruxtSite connects Drupal to Nuxt via JSON:API to provide a framework for building a Fully Decoupled site.

This repostory provides a quickstart installation of:
- Drupal 9
- Nuxt 2
- DruxtSite


## Try it on GitPod

This repository can be run on GitPod, allowing you to run this code inside of a VS Code cloud IDE:

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/druxt/quickstart-druxt-site)


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

### @nuxtjs/storybook

> Storybook integration with NuxtJS .

Druxt integrates with the Nuxt Storybook module to provide zero-configuration, auto-discovery stories with access to live data from your Drupal backend.

Refer to the Service list above.



## License

[MIT](https://github.com/druxt/druxt.js/blob/develop/LICENSE)
