<template>
  <div>
    <!-- Each region carries the class Drupal's Olivero theme gives it. Druxt
         keeps its own data out of the markup, so a class is what a
         stylesheet or a test can rely on. -->
    <div>
      <div v-if="$scopedSlots.header" class="region region--header">
        <slot name="header" />
      </div>
      <nav>
        <div v-if="$scopedSlots.primary_menu" class="region region--primary-menu">
          <slot name="primary_menu" />
        </div>
        <div v-if="$scopedSlots.secondary_menu" class="region region--secondary-menu">
          <slot name="secondary_menu" />
        </div>
      </nav>
    </div>
    <div v-if="$scopedSlots.hero" class="region region--hero">
      <slot name="hero" />
    </div>
    <main>
      <div v-if="$scopedSlots.highlighted" class="region region--highlighted">
        <slot name="highlighted" />
      </div>
      <div v-if="$scopedSlots.breadcrumb" class="region region--breadcrumb">
        <slot name="breadcrumb" />
      </div>
      <div>
        <header>
          <div v-if="$scopedSlots.content_above" class="region region--content-above">
            <slot name="content_above" />
          </div>
        </header>
        <div v-if="$scopedSlots.content" class="region region--content">
          <slot name="content" />
        </div>
        <aside v-if="$scopedSlots.sidebar" class="region region--sidebar">
          <slot name="sidebar" />
        </aside>
      </div>
      <div v-if="$scopedSlots.content_below" class="region region--content-below">
        <slot name="content_below" />
      </div>
      <div v-if="$scopedSlots.social_bar" class="region region--social-bar">
        <slot name="social_bar" />
      </div>
    </main>
    <footer>
      <div v-if="$scopedSlots.footer_top" class="region region--footer-top">
        <slot name="footer_top" />
      </div>
      <div v-if="$scopedSlots.footer_bottom" class="region region--footer-bottom">
        <slot name="footer_bottom" />
      </div>
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
