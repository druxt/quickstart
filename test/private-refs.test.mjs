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
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  findPrivateRefs,
  lintPrivateRefs,
  main,
  trackedFiles,
} from '../scripts/lint-private-refs.mjs'

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

// A tracked file git knows about but the filesystem cannot produce -
// staged then deleted, or a symlink to nowhere. Reading it throws, and
// the lint has to carry on rather than take the whole run down with it.
describe('lintPrivateRefs, unreadable files', () => {
  it('skips a tracked file that cannot be read', () => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'druxt-private-'))
    try {
      execFileSync('git', ['-C', repo, 'init', '-q'])
      fs.writeFileSync(path.join(repo, 'gone.md'), 'https://gitlab.local/a/b\n')
      execFileSync('git', ['-C', repo, 'add', 'gone.md'])
      fs.rmSync(path.join(repo, 'gone.md'))
      assert.deepEqual(lintPrivateRefs(repo), [])
    } finally {
      fs.rmSync(repo, { recursive: true, force: true })
    }
  })

  it('skips a tracked binary file', () => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'druxt-private-'))
    try {
      execFileSync('git', ['-C', repo, 'init', '-q'])
      fs.writeFileSync(
        path.join(repo, 'logo.bin'),
        Buffer.concat([Buffer.from('https://gitlab.local/a/b'), Buffer.from([0])])
      )
      execFileSync('git', ['-C', repo, 'add', 'logo.bin'])
      assert.deepEqual(lintPrivateRefs(repo), [])
    } finally {
      fs.rmSync(repo, { recursive: true, force: true })
    }
  })
})

// main() in-process, so the reporting is measured. The child-process
// suite below proves the same thing end to end, but node counts none of
// a child's lines as covered.
describe('main', () => {
  /** main() exits and prints; capture both. */
  function runMain(root) {
    const realExit = process.exit
    const realError = console.error
    const realLog = console.log
    let exited = null
    let output = ''
    process.exit = (code) => {
      exited = code
      throw new Error('__exit__')
    }
    console.error = (text) => {
      output += text
    }
    console.log = (text) => {
      output += text
    }
    try {
      main(root)
    } catch (error) {
      if (error.message !== '__exit__') {
        throw error
      }
    } finally {
      process.exit = realExit
      console.error = realError
      console.log = realLog
    }
    return { exited, output }
  }

  /** A repo containing exactly `files`, all tracked. */
  function withRepo(files, run) {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'druxt-private-main-'))
    try {
      execFileSync('git', ['-C', repo, 'init', '-q'])
      for (const [name, contents] of Object.entries(files)) {
        fs.writeFileSync(path.join(repo, name), contents)
        execFileSync('git', ['-C', repo, 'add', name])
      }
      run(repo)
    } finally {
      fs.rmSync(repo, { recursive: true, force: true })
    }
  }

  it('reports success and does not exit when nothing is referenced', () => {
    withRepo({ 'README.md': 'See https://github.com/druxt/quickstart\n' }, (repo) => {
      const { exited, output } = runMain(repo)
      assert.equal(exited, null)
      assert.match(output, /No private hosts referenced/)
    })
  })

  it('exits 1 naming every offender by file and line', () => {
    withRepo(
      {
        'composer.json': '{\n  "x": "https://gitlab.local/a/b"\n}\n',
        'README.md': 'clone git@git.lan:druxt/quickstart.git\n',
      },
      (repo) => {
        const { exited, output } = runMain(repo)
        assert.equal(exited, 1)
        assert.match(output, /composer\.json:2: gitlab\.local/)
        assert.match(output, /README\.md:1: git\.lan/)
        assert.match(output, /This repository is public/)
      }
    )
  })
})

// The same exits through the real command, which is what a person and
// CI actually run.
describe('the command', () => {
  const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../scripts')

  /** A repo carrying a copy of scripts/, plus whatever `files` says. */
  function withRepo(files, run) {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'druxt-private-cli-'))
    try {
      execFileSync('git', ['-C', repo, 'init', '-q'])
      fs.cpSync(source, path.join(repo, 'scripts'), { recursive: true })
      for (const [name, contents] of Object.entries(files)) {
        fs.writeFileSync(path.join(repo, name), contents)
        execFileSync('git', ['-C', repo, 'add', name])
      }
      const result = spawnSync(
        process.execPath,
        [path.join(repo, 'scripts/lint-private-refs.mjs')],
        {
          encoding: 'utf8',
        }
      )
      run(result)
    } finally {
      fs.rmSync(repo, { recursive: true, force: true })
    }
  }

  it('exits 0 and says so when nothing is referenced', () => {
    withRepo({ 'README.md': 'See https://github.com/druxt/quickstart\n' }, (result) => {
      assert.equal(result.status, 0, result.stderr)
      assert.match(result.stdout, /No private hosts referenced/)
    })
  })

  it('exits 1 and names the file and line', () => {
    withRepo({ 'composer.json': '{\n  "x": "https://gitlab.local/a/b"\n}\n' }, (result) => {
      assert.equal(result.status, 1)
      const output = result.stdout + result.stderr
      assert.match(output, /composer\.json:2: gitlab\.local/)
      assert.match(output, /This repository is public/)
    })
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
