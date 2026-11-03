/**
 * Tests for the DDEV commands, which Lando runs too.
 *
 * Each command hands Drupal a PHP script as one single-quoted shell
 * argument. An apostrophe anywhere in that PHP, a comment included, ends
 * the argument, and bash runs the rest as shell code. A balanced pair still
 * parses, so `bash -n` alone is not enough.
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const COMMANDS = path.join(REPO, 'drupal/.ddev/commands')
const files = fs
  .readdirSync(COMMANDS, { withFileTypes: true })
  .filter((dir) => dir.isDirectory())
  .flatMap((dir) =>
    fs.readdirSync(path.join(COMMANDS, dir.name)).map((name) => path.join(COMMANDS, dir.name, name))
  )

describe('DDEV commands', () => {
  it('finds the commands', () => {
    assert.ok(files.length >= 2, `only ${files.length} command files in ${COMMANDS}`)
  })

  for (const file of files) {
    const name = path.relative(REPO, file)

    it(`${name} parses as bash`, () => {
      const result = spawnSync('bash', ['-n', file], { encoding: 'utf8' })
      assert.equal(result.status, 0, result.stderr)
    })

    it(`${name} keeps its php-eval script free of apostrophes`, () => {
      const source = fs.readFileSync(file, 'utf8')
      for (const [, script] of source.matchAll(/php-eval '\n([\s\S]*?)\n'\s*$/gm)) {
        const line = script.split('\n').find((text) => text.includes("'"))
        assert.equal(line, undefined, `an apostrophe ends the php-eval argument: ${line}`)
      }
    })
  }
})
