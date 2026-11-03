/* global describe, expect, test */

import DruxtModule from 'druxt/dist/components/DruxtModule.vue'

// A component built the way the custom module tutorial builds one. Druxt
// publishes DruxtModule as a .vue file with ES imports, so it only loads if Jest
// transforms it, with a Babel config that reaches node_modules.
const Example = {
  name: 'ExampleModule',
  extends: DruxtModule,
  druxt: {
    componentOptions: () => [['Default']],
    propsData: () => ({}),
  },
}

describe('A component that extends DruxtModule', () => {
  test('loads under Jest', () => {
    expect(Example.extends).toBe(DruxtModule)
    expect(typeof DruxtModule.fetch).toBe('function')
  })
})
