import { describe, it, expect } from 'vitest'
import { parseActions, describe as say, addTaskToBriefing, findTask, newNote, appendToNote, gmailDraftUrl } from '../lib/assist.js'
import { parseNote } from '../lib/vault.js'

describe('parseActions', () => {
  const reply = 'Sure, here is the plan.\n\n```actions\n' + JSON.stringify([
    { type: 'add_task', text: 'Email Priya about Study Group', due: '2026-10-22' },
    { type: 'create_note', title: 'Study Group', folder: '03-Areas', noteType: 'area', body: 'Skill sessions.' },
    { type: 'create_note', title: '../evil', folder: '/etc', noteType: 'area', body: 'x' },
    { type: 'delete_everything' },
  ]) + '\n```'
  const r = parseActions(reply)
  it('separates the answer from the actions', () => expect(r.answer).toBe('Sure, here is the plan.'))
  it('keeps valid actions and rejects unsafe or unknown ones', () => {
    expect(r.actions.map(a => a.type)).toEqual(['add_task', 'create_note'])
    expect(r.rejected).toHaveLength(2)
  })
  it('handles replies without actions or with broken JSON', () => {
    expect(parseActions('Just an answer').actions).toEqual([])
    expect(parseActions('x ```actions\n{oops\n```').rejected[0]).toMatch(/JSON/)
  })
  it('describes each action in plain words', () => {
    expect(say(r.actions[0])).toBe('Add task "Email Priya about Study Group" due 2026-10-22 to today\'s list')
  })
})

describe('edits', () => {
  const brief = '# B\n\n## 🔥 Needs you today\n- [ ] one\n\n## ✉️ Email\n- x'
  it('adds a task at the end of the Needs you section', () => {
    expect(addTaskToBriefing(brief, 'two', '2026-10-22')).toBe('# B\n\n## 🔥 Needs you today\n- [ ] one\n- [ ] two 📅 2026-10-22\n\n## ✉️ Email\n- x')
  })
  it('creates the section when there is none', () => {
    expect(addTaskToBriefing('# B', 'two')).toBe('# B\n\n## 🔥 Needs you today\n- [ ] two\n')
  })
  it('finds a task by its text', () => {
    expect(findTask(addTaskToBriefing(brief, 'Email Priya'), 'priya')).toBe(1)
    expect(() => findTask(brief, 'nope')).toThrow()
  })
  it('makes new notes private with proper frontmatter', () => {
    const n = parseNote('03-Areas/Study Group.md', newNote({ title: 'Study Group', noteType: 'area', body: 'hi' }, '2026-10-20'))
    expect([n.type, n.visibility, n.created]).toEqual(['area', 'private', '2026-10-20'])
  })
  it('appends a bullet to a note, without doubling one', () => {
    expect(appendToNote('a\n\n', 'b')).toBe('a\n- b\n')
    expect(appendToNote('a', '- b')).toBe('a\n- b\n')
  })
  it('builds a Gmail compose link, never sending', () => {
    expect(gmailDraftUrl({ to: 'a@b.com', subject: 'Hi there', body: 'x' })).toBe('https://mail.google.com/mail/?view=cm&fs=1&to=a%40b.com&su=Hi%20there&body=x')
  })
})
