/**
 * Tests for scripts/lint-private-refs.mjs.
 *
 * The rule this enforces was written after a self-hosted merge request
 * link shipped in drupal/composer.json, so the first case here is that
 * exact string. The rest fence the rule in: it has to stay quiet about
 * the loopback and container hosts this project uses constantly, or it
 * gets switched off and stops catching anything.
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'

import { findPrivateRefs, lintPrivateRefs, trackedFiles } from '../scripts/lint-private-refs.mjs'

/** Hosts on the author's network and nowhere else. */
const PRIVATE = [
  'https://gitlab.local/drupal/druxt/-/merge_requests/5',
  'http://jenkins.internal/job/build',
  'git@git.lan:druxt/quickstart.git',
  'http://10.0.0.5:8080/status',
  'http://192.168.1.20/admin',
  'http://172.16.4.4/admin',
]

/** Hosts this project genuinely uses, which must never be flagged. */
const ALLOWED = [
  'http://localhost:3000/callback',
  'http://127.0.0.1:8888',
  'https://quickstart.ddev.site',
  'https://quickstart.lndo.site',
  'https://www.drupal.org/project/druxt',
  'https://github.com/druxt/quickstart',
  'http://172.15.0.1/outside-the-block',
  'http://172.32.0.1/outside-the-block',
]

describe('findPrivateRefs', () => {
  for (const url of PRIVATE) {
    it(`flags ${url}`, () => {
      assert.equal(findPrivateRefs(url).length, 1)
    })
  }

  for (const url of ALLOWED) {
    it(`allows ${url}`, () => {
      assert.deepEqual(findPrivateRefs(url), [])
    })
  }

  it('reports the line the reference sits on', () => {
    const found = findPrivateRefs('one\ntwo\nsee https://gitlab.local/x for details\n')
    assert.deepEqual(found, [{ line: 3, host: 'gitlab.local' }])
  })

  it('reports every reference on a line', () => {
    assert.equal(findPrivateRefs('http://a.local/x http://b.internal/y').length, 2)
  })

  it('ignores a bare word that is not a URL', () => {
    assert.deepEqual(findPrivateRefs('the gitlab.local host is internal'), [])
  })
})

describe('lintPrivateRefs', () => {
  it('passes over this repository', () => {
    assert.deepEqual(lintPrivateRefs(), [])
  })

  it('reports file and line for a tracked offender', () => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'druxt-private-'))
    try {
      execFileSync('git', ['-C', repo, 'init', '-q'])
      fs.writeFileSync(
        path.join(repo, 'composer.json'),
        '{\n  "x": "https://gitlab.local/a/b"\n}\n'
      )
      execFileSync('git', ['-C', repo, 'add', 'composer.json'])
      assert.deepEqual(lintPrivateRefs(repo), ['composer.json:2: gitlab.local'])
    } finally {
      fs.rmSync(repo, { recursive: true, force: true })
    }
  })

  // Only tracked files get published, so an ignored scratch file with a
  // private URL in it is not a leak and must not fail anyone's lint run.
  it('ignores untracked files', () => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'druxt-private-'))
    try {
      execFileSync('git', ['-C', repo, 'init', '-q'])
      fs.writeFileSync(path.join(repo, 'scratch.md'), 'https://gitlab.local/a/b\n')
      assert.deepEqual(lintPrivateRefs(repo), [])
    } finally {
      fs.rmSync(repo, { recursive: true, force: true })
    }
  })
})

describe('trackedFiles', () => {
  it('lists the files git knows about', () => {
    const files = trackedFiles()
    assert.ok(files.includes('package.json'))
    assert.ok(files.includes('scripts/lint-private-refs.mjs'))
    assert.equal(
      files.filter((file) => file === '').length,
      0,
      'the -z split must not leave an empty entry'
    )
  })
})
