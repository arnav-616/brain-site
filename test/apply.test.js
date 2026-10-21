import { describe, it, expect, beforeEach } from 'vitest'
import { applyActions, matchOne } from '../lib/apply.js'

// A tiny in-memory vault.
function memStore(files) {
  const f = { ...files }
  return {
    files: f,
    read: (rel) => f[rel] ?? null,
    write: (rel, text) => { f[rel] = text },
    move: (from, to) => { f[to] = f[from]; delete f[from] },
    notes: () => Object.keys(f).filter(p => p.endsWith('.md')),
  }
}
const today = '2026-10-21'
const J = (o) => JSON.stringify(o, null, 2) + '\n'

let store
beforeEach(() => {
  store = memStore({
    'Today.md': '---\ntype: daily\n---\n# Briefing\n\n## 🔥 Needs you today\n- [ ] Reply to Priya about the study group\n- [ ] Confirm HackFest RSVP 📅 2026-10-13\n- [ ] Start #5 on the backend\n\n## ✉️ Email\n- x\n',
    '03-Areas/Career.md': '---\ntype: area\nvisibility: private\n---\n# Career\n\n- HackFest: accepted, Nov 14\n- Kaggle competition\n- Kaggle meetup\n',
    '03-Areas/School.md': '---\ntype: area\n---\n# School\n\nCS 128 lectures\n',
    '.brain/deadlines.json': J([{ date: '2026-11-14', title: 'HackFest at State U (Nov 14–15)', done: false }, { date: '2026-11-20', title: 'Problem set 5', done: false }]),
    '.brain/calendar.json': J({ items: [{ title: 'Club meeting', start: '2026-10-22T23:00:00.000Z' }, { title: 'Dentist', start: '2026-10-23T15:00:00.000Z' }] }),
    '.brain/email.json': J({ items: [{ from: 'Acme Cloud Alerts', subject: '1 high security violation', summary: 'Check it', url: 'u1' }, { from: 'Priya Shah', subject: 'Study group', summary: 'Still interested?', url: 'u2' }] }),
    '.brain/applications.json': J({ items: [{ id: 'stryker-ds', company: 'Stryker', role: 'Data Science Intern', stage: 'saw' }] }),
  })
})

const run = (actions, dryRun = false) => applyActions(actions, store, { today, dryRun })
const read = (rel) => store.files[rel]
const readJ = (rel) => JSON.parse(store.files[rel])

describe('removing and finishing things', () => {
  it('removes a cancelled event from deadlines', () => {
    const r = run([{ type: 'remove_deadline', match: 'hackfest' }])
    expect(r.results[0]).toMatchObject({ ok: true, said: 'Remove deadline: "HackFest at State U (Nov 14–15)" (Nov 14)' })
    expect(readJ('.brain/deadlines.json').map(d => d.title)).toEqual(['Problem set 5'])
  })
  it('removes a task line, and marks another done', () => {
    run([{ type: 'remove_task', match: 'HackFest RSVP' }, { type: 'complete_task', match: 'reply to priya' }])
    expect(read('Today.md')).not.toContain('HackFest')
    expect(read('Today.md')).toContain('- [x] Reply to Priya')
    expect(read('Today.md')).toContain('- [ ] Start #5')
  })
  it('hides a calendar event without touching the calendar data', () => {
    const r = run([{ type: 'hide_event', match: 'club' }])
    expect(r.results[0].said).toMatch(/Hide calendar event: "Club meeting".*Calendar app isn't changed/)
    expect(readJ('.brain/hidden.json').events).toEqual([{ title: 'Club meeting', start: '2026-10-22T23:00:00.000Z' }])
    expect(readJ('.brain/calendar.json').items).toHaveLength(2)
  })
  it('marks an email handled and removes an application', () => {
    run([{ type: 'mark_email_handled', match: 'security violation' }, { type: 'remove_application', match: 'stryker' }])
    expect(readJ('.brain/email.json').items[0].handled).toBe(true)
    expect(readJ('.brain/email.json').items[1].handled).toBeUndefined()
    expect(readJ('.brain/applications.json').items).toEqual([])
  })
  it('removes one line from a note, keeping its frontmatter', () => {
    run([{ type: 'remove_from_note', note: 'Career', match: 'HackFest' }])
    expect(read('03-Areas/Career.md')).toBe('---\ntype: area\nvisibility: private\n---\n# Career\n\n- Kaggle competition\n- Kaggle meetup\n')
  })
  it('archives a note instead of deleting it', () => {
    run([{ type: 'archive_note', note: 'School' }])
    expect(read('03-Areas/School.md')).toBeUndefined()
    expect(read('05-Archive/School.md')).toContain('CS 128')
  })
})

describe('changing things', () => {
  it('moves deadlines and tasks, edits note text, moves applications', () => {
    run([
      { type: 'reschedule_deadline', match: 'problem set', date: '2026-11-22' },
      { type: 'reschedule_task', match: 'backend', due: '2026-10-24' },
      { type: 'replace_in_note', note: 'Career', find: 'accepted, Nov 14', replace: 'not going' },
      { type: 'move_application', match: 'stryker', stage: 'applied' },
    ])
    expect(readJ('.brain/deadlines.json')[1].date).toBe('2026-11-22')
    expect(read('Today.md')).toContain('- [ ] Start #5 on the backend 📅 2026-10-24')
    expect(read('03-Areas/Career.md')).toContain('- HackFest: not going')
    expect(readJ('.brain/applications.json').items[0]).toMatchObject({ stage: 'applied', updated: today })
  })
  it('adds an application and logs a check-in', () => {
    run([{ type: 'add_application', company: 'Wikimedia', role: 'SWE Intern', stage: 'applied' }, { type: 'log_checkin', text: 'slept 7h, gym' }])
    expect(readJ('.brain/applications.json').items[1]).toMatchObject({ company: 'Wikimedia', stage: 'applied' })
    expect(readJ('.brain/checkins.json').items[0]).toMatchObject({ date: today, sleep: 7, workout: true })
  })
})

describe('safety', () => {
  it('refuses vague matches instead of guessing', () => {
    const r = run([{ type: 'remove_from_note', note: 'Career', match: 'kaggle' }])
    expect(r.results[0]).toMatchObject({ ok: false })
    expect(r.results[0].error).toMatch(/appears on 2 lines/)
    expect(matchOne(['a b', 'a c'], x => x, 'a b', 'thing')).toBe('a b') // exact wins
    expect(() => matchOne(['a b', 'a c'], x => x, 'a', 'thing')).toThrow(/matches 2 things/)
    expect(matchOne(['HackFest (State U)', 'Other'], x => x, 'hackfest state-u', 'event')).toBe('HackFest (State U)')
  })
  it('says clearly when nothing matches', () => {
    expect(run([{ type: 'remove_deadline', match: 'dentist' }]).results[0].error).toBe('No deadline matching "dentist"')
  })
  it('is all or nothing: one failure means nothing is written', () => {
    const before = { ...store.files }
    const r = run([{ type: 'remove_deadline', match: 'hackfest' }, { type: 'remove_task', match: 'nonexistent' }])
    expect(r.applied).toBe(false)
    expect(store.files).toEqual(before)
  })
  it('a dry run describes exactly what would change and writes nothing', () => {
    const before = { ...store.files }
    const r = run([{ type: 'remove_task', match: 'rsvp' }, { type: 'archive_note', note: 'School' }], true)
    expect(r.results.map(x => x.said)).toEqual(['Remove task: "Confirm HackFest RSVP"', 'Archive [[School]] (moved to 05-Archive, not deleted)'])
    expect(store.files).toEqual(before)
  })
  it('never changes privacy and never archives the briefing', () => {
    expect(run([{ type: 'replace_in_note', note: 'Career', find: 'visibility: private', replace: 'visibility: public' }]).results[0].error).toMatch(/Privacy tab/)
    expect(run([{ type: 'archive_note', note: 'Today' }]).results[0].error).toMatch(/can't be archived/)
  })
  it('later actions see earlier ones in the same batch', () => {
    const r = run([{ type: 'add_task', text: 'Email the TA' }, { type: 'complete_task', match: 'email the ta' }])
    expect(r.results.every(x => x.ok)).toBe(true)
    expect(read('Today.md')).toContain('- [x] Email the TA')
  })
})
