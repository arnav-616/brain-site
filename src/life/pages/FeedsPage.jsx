import { call } from '../../api'
import { Card, JobStatus, PageTitle } from '../ui'
import { relDay } from '../dates'

// How to get each app's "Download your data" export. Apps don't let other programs read your
// account directly, so this is the only way in — and it means nothing logs in as you.
const HOW = [
  ['Instagram', 'Settings → Accounts Center → Your information and permissions → Download your information. Pick JSON.'],
  ['TikTok', 'Settings and privacy → Account → Download your data. Pick JSON.'],
  ['YouTube', 'takeout.google.com → deselect all → YouTube. Under "Multiple formats", set History to JSON.'],
  ['Spotify', 'spotify.com/account/privacy → Download your data → Account data. Takes a few days.'],
  ['X', 'Settings → Your account → Download an archive of your data.'],
  ['Reddit', 'reddit.com/settings/data-request'],
]

// What you watch, listen to, save and post, from your apps' data exports.
export default function FeedsPage({ graph, job }) {
  const social = graph.social
  const platforms = social?.platforms ?? []
  const have = new Set(platforms.map(p => p.platform))

  return (
    <>
      <PageTitle title="Feeds" subtitle={platforms.length ? `From your app exports, read ${relDay(social.updated).toLowerCase()}.` : 'What you watch, listen to, save and post, all in one place.'}>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => call('openImports')} className="action action-quiet">Open the Imports folder</button>
          <button disabled={job.busy} onClick={job.rescan} className="action">Read new exports</button>
        </div>
      </PageTitle>
      <JobStatus job={job} />

      {platforms.length > 0 && (
        <div className="mb-10 grid gap-5 lg:grid-cols-2">
          {platforms.map(p => (
            <Card key={p.platform + p.from} title={p.platform}>
              {p.range?.[0] && <p className="-mt-2 mb-3 text-xs text-mute">{p.range[0]} to {p.range[1]}</p>}
              <dl className="mb-4 flex flex-wrap gap-x-8 gap-y-3">
                {Object.entries(p.stats).map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-mute">{k}</dt><dd className="font-display text-xl text-ink">{v.toLocaleString()}</dd></div>
                ))}
              </dl>
              {Object.entries(p.lists ?? {}).map(([k, list]) => list.length > 0 && (
                <div key={k} className="mb-4">
                  <h3 className="mb-1.5 text-sm font-medium text-ink">{k}</h3>
                  <ol className="space-y-1 text-sm">
                    {list.slice(0, 6).map(x => <li key={x.name} className="flex gap-3"><span className="min-w-0 flex-1 truncate text-ink/85">{x.name}</span><span className="text-mute">{x.count}</span></li>)}
                  </ol>
                </div>
              ))}
              {p.recent?.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-sm font-medium text-ink">Recent</h3>
                  <ul className="space-y-1 text-sm">
                    {p.recent.slice(0, 8).map((r, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="min-w-0 flex-1 truncate">{r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="text-ink/85 hover:text-[#5EEAD4]">{r.title}</a> : <span className="text-ink/85">{r.title}</span>}</span>
                        {r.date && <span className="shrink-0 text-mute">{relDay(r.date)}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Card title={platforms.length ? 'Add more apps' : 'Connect your apps'}>
        <ol className="mb-5 list-decimal space-y-1 pl-5 text-sm text-ink/80">
          <li>Request your data export from each app (steps below). Most arrive by email within a day.</li>
          <li>Drop the downloaded .zip (or the unzipped folder) into the Imports folder.</li>
          <li>Press <b className="text-ink">Read new exports</b>. Everything stays on this laptop and is never published.</li>
        </ol>
        <ul className="divide-y divide-white/5">
          {HOW.map(([name, how]) => (
            <li key={name} className="flex gap-4 py-2.5 text-sm">
              <span className="w-24 shrink-0 font-medium text-ink">{name}{have.has(name) && <span className="ml-1.5 text-[#5EEAD4]">✓</span>}</span>
              <span className="text-mute">{how}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
