// Flags fence-marker-with-language lines (```bash, ````js, ...) appearing
// as CONTENT inside an already-open fenced code block. That is legal
// CommonMark - a 4-backtick fence can contain 3-backtick markers as
// literal text, and inside a 3-backtick block a ```lang line doesn't
// close it (closing fences may not carry an info string) - which is
// exactly why no core markdownlint rule catches it. In practice it is
// almost always a mangled edit: an opener where the closer belongs,
// silently swallowing the prose after it into the rendered code block.
//
// Deliberately showing markdown fences inside a wider fence? Use a
// `markdown` info string on the outer fence - that combination is
// skipped here.
'use strict'

// CommonMark allows whitespace between the fence marker and the info
// string ("``` bash"), and the info string itself may be multi-word -
// `.*` + trim covers both, so a space-separated opener can't slip past
// the rule's fence-state tracking unmatched.
const FENCE = /^(\s*)(`{3,}|~{3,})(.*)$/

module.exports = {
  names: ['local/no-fence-in-fence'],
  description: 'Fence marker with a language inside an open code fence (mangled fences swallow prose)',
  tags: ['code', 'local'],
  parser: 'none',
  function: (params, onError) => {
    let open = null

    params.lines.forEach((line, index) => {
      const match = line.match(FENCE)
      if (!match) {
        return
      }
      const marker = match[2]
      const info = match[3].trim()
      // CommonMark: a backtick fence's info string may not contain
      // backticks - such a line is inline code, not a fence.
      if (marker[0] === '`' && info.includes('`')) {
        return
      }
      // First word of the info string is the language.
      const language = (info.split(/\s+/)[0] || '').toLowerCase()

      if (!open) {
        open = { char: marker[0], length: marker.length, language }
        return
      }

      // A closing fence: same character, at least as long, no info string.
      if (marker[0] === open.char && marker.length >= open.length && info === '') {
        open = null
        return
      }

      // Anything fence-like WITH a language while a fence is open is
      // content - and almost certainly a mistake, unless the outer
      // fence says it contains markdown.
      if (info !== '' && !['markdown', 'md'].includes(open.language)) {
        onError({
          lineNumber: index + 1,
          detail: `"${marker}${info}" is inside an open ${open.char.repeat(open.length)}${open.language} fence - a mangled opener/closer pair renders the prose after it as code`,
        })
      }
    })
  },
}
