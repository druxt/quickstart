/**
 * Structural validation for this extension's package.json + content.
 *
 * There's no activation code here (every walkthrough step is static
 * markdown, no custom commands) - the only way this extension actually
 * breaks is a malformed contribution or a dangling file reference, and
 * VS Code fails those silently (a step just renders empty). This is
 * what catches that before it ships.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.dirname(fileURLToPath(import.meta.url))
let failures = 0

function fail(message) {
  console.error(`FAIL: ${message}`)
  failures++
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`${label} must be a non-empty string`)
    return false
  }
  return true
}

function assertFileExists(relativePath, label) {
  const resolved = path.resolve(DIR, relativePath)
  if (!fs.existsSync(resolved)) {
    fail(`${label} points at a file that does not exist: ${relativePath}`)
    return false
  }
  return true
}

// Every markdown-relative link (e.g. [README.md](../../../README.md)) that
// isn't an http(s) URL or a command: link should resolve to a real file.
function checkMarkdownLinks(mdPath) {
  const content = fs.readFileSync(mdPath, 'utf8')
  const linkPattern = /\]\(([^)]+)\)/g
  let match
  while ((match = linkPattern.exec(content)) !== null) {
    const target = match[1]
    if (/^(https?:|command:|#)/.test(target)) {
      continue
    }
    const resolved = path.resolve(path.dirname(mdPath), target)
    if (!fs.existsSync(resolved)) {
      fail(`${path.relative(DIR, mdPath)} links to a file that does not exist: ${target}`)
    }
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(DIR, 'package.json'), 'utf8'))

const walkthroughs = pkg.contributes?.walkthroughs
if (!Array.isArray(walkthroughs) || walkthroughs.length === 0) {
  fail('contributes.walkthroughs must be a non-empty array')
} else {
  for (const walkthrough of walkthroughs) {
    assertString(walkthrough.id, 'walkthrough.id')
    assertString(walkthrough.title, 'walkthrough.title')
    assertString(walkthrough.description, 'walkthrough.description')

    if (!Array.isArray(walkthrough.steps) || walkthrough.steps.length === 0) {
      fail(`walkthrough "${walkthrough.id}" must have a non-empty steps array`)
      continue
    }

    const seenStepIds = new Set()
    for (const step of walkthrough.steps) {
      assertString(step.id, `step.id in walkthrough "${walkthrough.id}"`)
      assertString(step.title, `step "${step.id}".title`)
      assertString(step.description, `step "${step.id}".description`)

      if (seenStepIds.has(step.id)) {
        fail(`duplicate step id "${step.id}" in walkthrough "${walkthrough.id}"`)
      }
      seenStepIds.add(step.id)

      const media = step.media
      if (!media || typeof media !== 'object') {
        fail(`step "${step.id}" is missing a media object`)
        continue
      }

      const mediaKinds = ['image', 'markdown', 'svg'].filter((kind) => media[kind])
      if (mediaKinds.length !== 1) {
        fail(
          `step "${step.id}".media must have exactly one of image/markdown/svg, found: ${mediaKinds.join(', ') || 'none'}`
        )
        continue
      }

      const mediaPath = media[mediaKinds[0]]
      if (
        assertFileExists(mediaPath, `step "${step.id}".media.${mediaKinds[0]}`) &&
        mediaKinds[0] === 'markdown'
      ) {
        checkMarkdownLinks(path.resolve(DIR, mediaPath))
      }

      if ((mediaKinds[0] === 'image' || mediaKinds[0] === 'svg') && !media.altText) {
        fail(`step "${step.id}".media.${mediaKinds[0]} is missing altText`)
      }
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} failure(s).`)
  process.exit(1)
}
console.log(`OK - ${pkg.name}: ${walkthroughs[0]?.steps.length ?? 0} steps validated.`)
