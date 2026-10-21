import { describe, it, expect } from 'vitest'
import { parseBriefing, section, parseTasks } from '../lib/briefing.js'
import { toggleTask } from '../lib/actions.js'

const body = `# Briefing — Tuesday, October 20

## 🔥 Needs you today
- [ ] one
- [ ] two

## ✉️ Email
- **X** — y

## 🧹 Upkeep
- [ ] split a note`

describe('parseBriefing', () => {
  const b = parseBriefing(body)
  it('reads the title and sections, splitting off the emoji', () => {
    expect(b.title).toBe('Briefing — Tuesday, October 20')
    expect(b.sections.map(s => s.title)).toEqual(['Needs you today', 'Email', 'Upkeep'])
    expect(b.sections[0].emoji).toBe('🔥')
  })
  it('records how many tasks come before each section', () => {
    expect(b.sections.map(s => s.taskOffset)).toEqual([0, 2, 2])
  })
  it('maps a task inside a card back to the right line of the file', () => {
    const up = section(b, 'upkeep')
    expect(toggleTask(body, up.taskOffset + 0, true)).toContain('- [x] split a note')
  })
  it('finds sections by the start of their name', () => {
    expect(section(b, 'needs').title).toBe('Needs you today')
    expect(section(b, 'calendar')).toBeUndefined()
  })
})

describe('parseTasks', () => {
  const body = '- [ ] RSVP to HackFest 📅 2026-10-13\n- [x] Accept invite\n- [ ] Start #5 📅 2026-10-25\ntext'
  const t = parseTasks(body, '2026-10-20')
  it('reads text, done and due date, keeping file order for toggling', () => {
    expect(t.map(x => [x.index, x.text, x.done, x.due])).toEqual([
      [0, 'RSVP to HackFest', false, '2026-10-13'], [1, 'Accept invite', true, null], [2, 'Start #5', false, '2026-10-25'],
    ])
  })
  it('marks open tasks past their date as overdue, never finished ones', () => {
    expect(t.map(x => x.overdue)).toEqual([true, false, false])
    expect(t.map(x => x.later)).toEqual([false, false, true])
    expect(parseTasks('- [x] old 📅 2026-01-01', '2026-10-20')[0].overdue).toBe(false)
  })
})
