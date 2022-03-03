<template>
  <div>Redirecting...</div>
</template>

<script>
export default {
  created() {
    this.$auth.loginWith('drupal-authorization_code')
  }
}
</script>
