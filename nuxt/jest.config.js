module.exports = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^~/(.*)$': '<rootDir>/$1',
    '^vue$': 'vue/dist/vue.common.js',
    '^~storybook': '<rootDir>/.nuxt-storybook/storybook/preview.js',
  },
  moduleFileExtensions: ['js', 'vue', 'json'],
  transform: {
    '^.+\\.js$': 'babel-jest',
    '.*\\.(vue)$': 'vue-jest',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/components/**/*.vue',
    '<rootDir>/pages/**/*.vue',
  ],
  // clover.xml: Codecov (GitHub Actions). cobertura: GitLab's native MR
  // coverage visualization (coverage_report artifact in .gitlab-ci.yml).
  // text: the coverage: regex both CI files use for the summary percentage.
  coverageReporters: ['clover', 'cobertura', 'lcov', 'text'],
  testEnvironment: 'jsdom',
}
