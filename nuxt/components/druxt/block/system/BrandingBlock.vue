<template>
  <div>
    <DruxtLogo v-if="settings.use_site_logo" />
    <span v-if="settings.use_site_name" v-text="title" />
  </div>
</template>

<script>
import { DruxtBlocksBlockMixin } from 'druxt-blocks'
export default {
  mixins: [DruxtBlocksBlockMixin],
  data: () => ({
    title: 'Druxt Quickstart'
  })
}
</script>

<style scoped>
* {
  font-size: 1.75rem;
}

svg {
  height: 2rem;
}
</style>
