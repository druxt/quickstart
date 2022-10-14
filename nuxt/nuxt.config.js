require('dotenv').config({ path: '../.env' })
const baseUrl = process.env.BASE_URL || ''

export default {
  target: process.env.NUXT_TARGET,

  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: 'quickstart-druxt-site',
    htmlAttrs: {
      lang: 'en'
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '' },
      { name: 'format-detection', content: 'telephone=no' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
    ]
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: [
  ],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [
  ],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
    // https://go.nuxtjs.dev/eslint
    '@nuxtjs/eslint-module',
    ['druxt-auth', { clientId: process.env.OAUTH_CLIENT_ID }],
    'druxt-site'
  ],

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [],

  // DruxtJS: https://druxtjs.org
  druxt: {
    // The baseUrl of the Druxt enabled Drupal JSON:API server.
    baseUrl,

    // Set the JSON:API endpoint, `/jsonapi` by default.
    // endpoint: '/jsonapi'

    // DruxtEntity module settings; https://druxtjs.org/modules/entity
    entity: {
      // Disable the deprecated DruxtField components.
      components: { fields: false },

      query: {
        // Enable Drupal display mode schema based filtering of the JSON:API
        // resource to reduce query size.
        // schema: true,
      },
    },

    // DruxtMenu module settings; https://druxtjs.org/modules/menu
    menu: {
      // Disable JSON:API Menu Items support. Enabled by the DruxtSite module.
      // jsonApiMenuItems: false
    },

    // Druxt proxy settings.
    proxy: {
      // Proxy the JSON:API request via the Nuxt proxy to prevent CORS issues.
      api: true

      // Proxy the Drupal files system, using `sites/default/files` by default.
      // Disable the proxy, or set a specific site to proxy.
      // files: 'domain.tld'
    },

    // DruxtRouter module settings; https://druxtjs.org/modules/router
    router: {
      // Experimental; Disable the DruxtRouter page middleware, removing routing
      // requests and server side redirects. Doing this allows Full Static
      // builds without the need of a live Drupal backend. The Route is still
      // is retrieved by the fetch hook instead.
      middleware: false

      // Disable the wildcard router, which is enabled by default in the
      // DruxtSite module. This allows more fine grained control over your
      // routing.
      // wildcard: false
    },

    // DruxtSite module settings; https://druxtjs.org/modules/site
    site: {
      // Disable the DruxtSite default layout.
      // layout: false,

      // Set the backend theme for DruxtBlock layouts.
      theme: 'olivero'
    },

    // DruxtViews module settings; https://druxtjs.org/modules/views
    views: {
      query: {
        // Filter the View results using the Views bundle filter, if available.
        // This reduces requests to just ID and type, and can be done manually
        // if the bundle filter has not been set in Drupal.
        bundleFilter: true,
      }
    }
  },

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {
  }
}
