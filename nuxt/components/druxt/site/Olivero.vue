<template>
  <div>
    <div>
      <slot name="header" />
      <nav>
        <slot name="primary_menu" />
        <slot name="secondary_menu" />
      </nav>
    </div>
    <slot name="hero" />
    <main>
      <slot name="highlighted" />
      <slot name="breadcrumb" />
      <div>
        <header>
          <slot name="content_above" />
        </header>
        <slot name="content" />
        <aside v-if="$scopedSlots['sidebar']">
          <slot name="sidebar" />
        </aside>
      </div>
      <slot name="content_below" />
      <slot name="social_bar" />
    </main>
    <footer>
      <slot name="footer_top" />
      <slot name="footer_bottom" />
    </footer>
  </div>
</template>

<script>
// @TODO - https://github.com/druxt/druxt.js/issues/545 
// import { DruxtSiteMixin } from 'druxt-site'
export default {
  // mixins: [DruxtSiteMixin]
  props: {
    /**
     * The JSON:API resource language code.
     *
     * @type {string}
     */
    langcode: {
      type: String,
      default: undefined,
    },

    /**
     * DruxtBlockRegion propsData for regions.
     *
     * @return {object}
     */
    props: {
      type: Object,
      default: () => ({}),
    },

    /**
     * The Block region names.
     *
     * @type {string[]},
     */
     regions: {
      type: Array,
      default: () => ([])
    },

    /**
     * The Drupal theme ID.
     *
     * @type {string}
     */
    theme: {
      type: String,
      required: true,
    },
  },
}
</script>
