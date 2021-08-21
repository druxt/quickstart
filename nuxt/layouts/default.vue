<template>
  <DruxtSite :theme="theme" />
</template>

<script>
export default {
  data: () => ({
    // The Drupal theme contains the Block/Region information.
    theme: 'bartik',
  })
}
</script>
