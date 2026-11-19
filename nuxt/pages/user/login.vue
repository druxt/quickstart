<template>
  <div v-if="$auth">Redirecting...</div>
  <div v-else>
    Sign-in is not set up. Set <code>OAUTH_CLIENT_ID</code> in <code>.env</code>
    to the client ID of an OAuth consumer on the backend, then start the site
    again.
  </div>
</template>

<script>
export default {
  created() {
    // Without OAUTH_CLIENT_ID the auth module is not loaded.
    if (this.$auth) {
      this.$auth.loginWith('drupal-authorization_code')
    }
  }
}
</script>
