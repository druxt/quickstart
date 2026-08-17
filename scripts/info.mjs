/**
 * Frontend toolchain summary, plus the backend summary from
 * drupal/.devtools/info.
 */

import { DRUPAL_DIR, NUXT_DIR, backendInfo, isPortOpen, run, runDevtools } from './lib.mjs'

const backend = backendInfo()

console.log('')
console.log('Frontend')
console.log('========')
console.log(`Node       : ${process.version}`)
console.log(`Directory  : ${NUXT_DIR}`)
console.log('')

if (backend.ddev) {
  console.log('Backend')
  console.log('=======')
  console.log(`BASE_URL   : ${backend.url} (DDEV)`)
  console.log('')
  try {
    run('ddev', ['describe'], { cwd: DRUPAL_DIR })
  } catch {
    console.error('(run `ddev describe` from drupal/ for backend details)')
  }
}
else {
  if (backend.url) {
    console.log('Backend')
    console.log('=======')
    console.log(`BASE_URL   : ${backend.url} (${backend.managed ? 'local .devtools' : 'external'})`)
    if (backend.managed) {
      const running = await isPortOpen(backend.host, backend.port)
      console.log(`Running    : ${running ? 'yes' : 'no'}`)
    }
    console.log('')
  }

  try {
    runDevtools('info')
  } catch {
    console.error('(drupal/.devtools/info unavailable - has the backend been assembled?)')
  }
}
