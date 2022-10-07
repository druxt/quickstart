<template>
  <div>
    Powered by <a href="https://drupal.org" target="_blank">Drupal</a>
    + <a href="https://nuxtjs.org" target="_blank">Nuxt</a>
    = <a href="https://druxtjs.org" target="_blank">Druxt</a>
  </div>
</template>

<script>
import { DruxtBlocksBlockMixin } from 'druxt-blocks'
export default {
  mixins: [DruxtBlocksBlockMixin]
}
</script>