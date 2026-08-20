// Covers the root scripts/ orchestration layer and this repo's bundled
// VS Code extension test - nuxt/ has its own separate .eslintrc.js
// (a pre-existing, differently-configured Vue/Nuxt setup) and drupal/
// is PHP, neither belongs under this config.
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default [
  { ignores: ['nuxt/**', 'drupal/**', '**/*.vsix'] },
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
  },
]
