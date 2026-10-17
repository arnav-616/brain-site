import { describe, it, expect } from 'vitest'
import { captureNote, uniqueName, toggleTask, setVisibility } from '../lib/actions.js'
import { parseNote } from '../lib/vault.js'

describe('captureNote', () => {
  it('names a thought after its first words and makes it a private inbox note', () => {
    const { title, content } = captureNote('look into how the fed sets the risk-free rate', '2026-10-16')
    expect(title).toBe('Look into how the fed sets the')
    const n = parseNote(`00-Inbox/${title}.md`, content)
    expect(n.type).toBe('inbox')
    expect(n.visibility).toBe('private')
    expect(n.created).toBe('2026-10-16')
    expect(n.body).toContain('risk-free rate')
  })
  it('names a bare link after its site', () => {
    expect(captureNote('https://www.investopedia.com/terms/c/capm.asp', '2026-10-16').title).toBe('Link from investopedia.com')
  })
  it('strips characters that are illegal in filenames', () => {
    expect(captureNote('what/is: a "beta"?', 'x').title).toBe('Whatis a beta')
  })
  it('rejects empty input', () => {
    expect(() => captureNote('   ', 'x')).toThrow()
  })
})

describe('uniqueName', () => {
  it('adds a number when the name is taken', () => {
    const taken = new Set(['Idea', 'Idea 2'])
    expect(uniqueName('Idea', n => taken.has(n))).toBe('Idea 3')
    expect(uniqueName('New', n => taken.has(n))).toBe('New')
  })
})

describe('toggleTask', () => {
  const raw = '# T\n- [ ] one\ntext\n- [x] two\n  - [ ] three'
  it('checks and unchecks the Nth task only', () => {
    expect(toggleTask(raw, 0, true)).toBe('# T\n- [x] one\ntext\n- [x] two\n  - [ ] three')
    expect(toggleTask(raw, 1, false)).toBe('# T\n- [ ] one\ntext\n- [ ] two\n  - [ ] three')
    expect(toggleTask(raw, 2, true)).toContain('  - [x] three')
  })
  it('counts tasks inside callouts too, like the renderer does', () => {
    expect(toggleTask('> - [ ] a\n- [ ] b', 1, true)).toBe('> - [ ] a\n- [x] b')
  })
  it('throws when the task does not exist', () => {
    expect(() => toggleTask(raw, 5, true)).toThrow()
  })
})

describe('setVisibility', () => {
  it('replaces an existing value', () => {
    expect(setVisibility('---\ntype: wiki\nvisibility: private\n---\nbody', 'public'))
      .toBe('---\ntype: wiki\nvisibility: public\n---\nbody')
  })
  it('adds the field when missing', () => {
    expect(parseNote('a.md', setVisibility('---\ntype: wiki\n---\nbody', 'public')).visibility).toBe('public')
  })
  it('rejects anything else', () => {
    expect(() => setVisibility('x', 'everyone')).toThrow()
  })
})
