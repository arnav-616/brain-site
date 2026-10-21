import { useEffect, useMemo, useState } from 'react'
import ReviewSession from '../ReviewSession'
import { call } from '../../api'
import { perDay } from '../../../lib/life.js'
import { Card, PageTitle } from '../ui'
import { DailyBars } from '../charts'

const today = () => new Date().toLocaleDateString('en-CA')

// Your week in numbers, then spaced review: today's flashcards and older notes worth another look.
export default function ReviewPage({ graph, onSelect, reload }) {
  const [stats, setStats] = useState(null)
  useEffect(() => { call('stats').then(setStats).catch(() => setStats({ tasksDone: [], captures: [], refreshes: [] })) }, [graph])
  const added = useMemo(() => perDay(graph.nodes.filter(n => !['daily', 'inbox'].includes(n.type)).map(n => n.created), today()), [graph])

  return (
    <>
      <PageTitle title="Review" subtitle="Your last two weeks, then spaced review: cards come back right before you'd forget them." />
      <Card title="Your last 14 days" className="mb-5">
        <div className="grid gap-6 md:grid-cols-3">
          <DailyBars title="Tasks done" data={perDay(stats?.tasksDone ?? [], today())} color="#5EEAD4" />
          <DailyBars title="Notes added" data={added} color="#A78BFA" />
          <DailyBars title="Things captured" data={perDay(stats?.captures ?? [], today())} color="#FBBF24" />
        </div>
      </Card>
      <div className="max-w-2xl"><Card title="Spaced review"><ReviewSession graph={graph} onSelect={onSelect} reload={reload} /></Card></div>
    </>
  )
}
