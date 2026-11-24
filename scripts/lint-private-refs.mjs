/**
 * Fail if a tracked file points at a host only the author can reach.
 *
 * This repository is public and is what people copy to start a site, so
 * a private URL in it is not a buried comment: composer-patches prints
 * every patch description during `composer install`, which is how a
 * self-hosted merge request link ended up in front of everyone who
 * followed the quickstart.
 *
 * The rule is the shape of the host, not a list of known hostnames -
 * anything resolvable only inside a LAN. localhost, loopback, and the
 * DDEV and Lando development domains are how this project runs locally,
 * so they are the exceptions.
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { exitWithError } from './lib.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Development hosts that are meant to be here. */
const ALLOWED = [/^localhost$/i, /^127\./, /^::1$/, /\.ddev\.site$/i, /\.lndo\.site$/i]

/** Hosts nobody outside the author's network can resolve. */
const PRIVATE_HOST = [
  /^[a-z0-9-]+(\.[a-z0-9-]+)*\.(local|internal|lan|home|corp|intranet)$/i,
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^f[cd][0-9a-f]{2}:/i,
  /^fe[89ab][0-9a-f]:/i,
]

/**
 * Scheme, then the authority's host.
 *
 * Userinfo has to be stepped over rather than captured, because a git
 * remote usually carries it - `https://oauth2:TOKEN@host/path` - and
 * capturing `oauth2` instead of the host let the whole URL through.
 */
// The bracket class takes dots as well as hex: an IPv4-mapped literal such as
// [::ffff:10.0.0.8] is a bracketed host that carries an RFC1918 address.
const URL_HOST =
  /(?:[a-z][a-z0-9+.-]*:\/\/(?:[^/@\s]*@)?|\bgit@)(\[[0-9A-Fa-f:.]+\]|[A-Za-z0-9._-]+)/g

/**
 * An SCP-style git remote, `user@host:path`.
 *
 * `git` is the usual account and not the only valid one, so
 * `deploy@10.0.0.8:team/repo.git` is a private host in a form the pattern
 * above never sees. The colon and something after it are required, and that
 * is what separates a remote from a version such as `eslint@10.0.0`, whose
 * host would otherwise read as an RFC1918 address.
 */
const SCP_HOST = /\b[A-Za-z0-9._-]+@(\[[0-9A-Fa-f:.]+\]|[A-Za-z0-9._-]+):(?=[^\s:])/g

/**
 * The IPv4 address inside an IPv4-mapped IPv6 literal, else the host as given.
 *
 * A mapped address has four spellings, compressed or expanded, with the last
 * 32 bits written as dotted decimal or as two hex groups. Matching the dotted
 * spelling alone let `[0:0:0:0:0:ffff:0a00:0008]` name a private endpoint that
 * every pattern below then read as a public one.
 */
export function mappedToIpv4(host) {
  if (!/^[0-9a-f:.]+$/i.test(host) || !host.includes(':')) return host

  // A trailing dotted quad occupies the last two groups. Rewriting it as hex
  // first means the zero-fill below only ever counts groups.
  const text = host.replace(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/, (_, a, b, c, d) =>
    [((+a << 8) | +b).toString(16), ((+c << 8) | +d).toString(16)].join(':')
  )

  const [head, tail] = text.split('::')
  const left = head ? head.split(':') : []
  const right = tail === undefined ? [] : tail ? tail.split(':') : []
  const groups =
    tail === undefined ? left : left.concat(Array(8 - left.length - right.length).fill('0'), right)

  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/i.test(g))) {
    return host
  }
  const value = groups.map((g) => parseInt(g, 16))
  if (!value.slice(0, 5).every((g) => g === 0) || value[5] !== 0xffff) {
    return host
  }
  return [value[6] >> 8, value[6] & 0xff, value[7] >> 8, value[7] & 0xff].join('.')
}

/** Every private host referenced by `text`, with the line it sits on. */
export function findPrivateRefs(text) {
  const found = []
  text.split('\n').forEach((line, index) => {
    // A host written as `https://user@host:8080/` matches both patterns, so
    // the same host on the same line is reported once.
    const seen = new Set()
    for (const pattern of [URL_HOST, SCP_HOST]) {
      for (const match of line.matchAll(pattern)) {
        const host = mappedToIpv4(match[1].replace(/^\[|\]$/g, '').replace(/[.:]+$/, ''))
        if (seen.has(host)) {
          continue
        }
        if (ALLOWED.some((candidate) => candidate.test(host))) {
          continue
        }
        if (PRIVATE_HOST.some((candidate) => candidate.test(host))) {
          seen.add(host)
          found.push({ line: index + 1, host })
        }
      }
    }
  })
  return found
}

/** Tracked files, which is the set that actually gets published. */
export function trackedFiles(root = ROOT) {
  return execFileSync('git', ['-C', root, 'ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
}

/**
 * The rule's own source and test state private hosts on purpose - the
 * patterns here, the examples there. Nothing else gets an exemption:
 * an opt-out marker anyone could paste would eventually be pasted over
 * a real leak.
 */
const SELF = ['scripts/lint-private-refs.mjs', 'test/private-refs.test.mjs']

export function lintPrivateRefs(root = ROOT) {
  const problems = []
  for (const file of trackedFiles(root)) {
    if (SELF.includes(file)) {
      continue
    }
    const absolute = path.join(root, file)
    let text
    try {
      // Git tracks symbolic links, and reading one follows it. A link to a
      // character device such as /dev/zero never reaches end of file, so the
      // read below would exhaust memory before the NUL check could reject it.
      if (!fs.lstatSync(absolute).isFile()) {
        continue
      }
      text = fs.readFileSync(absolute, 'utf8')
    } catch {
      continue
    }
    if (text.includes('\0')) {
      continue
    }
    for (const hit of findPrivateRefs(text)) {
      problems.push(`${file}:${hit.line}: ${hit.host}`)
    }
  }
  return problems
}

/**
 * What the command does, separated from the entry guard so a test can
 * measure it in-process. Run through a child process it works, but node
 * counts none of it as covered.
 */
export function main(root = ROOT) {
  const problems = lintPrivateRefs(root)
  if (problems.length > 0) {
    exitWithError(
      [
        'These tracked files reference a host that only resolves on a private network:',
        '',
        ...problems.map((problem) => `  ${problem}`),
        '',
        'This repository is public. Replace the reference with a public one,',
        'or describe the thing without a URL.',
      ].join('\n')
    )
  }
  console.log('No private hosts referenced by tracked files.')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
