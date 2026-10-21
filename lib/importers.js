// Turns "Download your data" exports from social/media apps into small summaries for the dashboard.
// Each importer takes { files: { relativePath: text } } and returns a summary, or null if the export
// isn't its platform. Pure functions — reading folders lives in scripts/import-exports.js.

const top = (counts, n = 8) =>
  Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([name, count]) => ({ name, count }))
const tally = (items, key) => items.reduce((c, x) => { const k = key(x); if (k) c[k] = (c[k] || 0) + 1; return c }, {})
const json = (text) => { try { return JSON.parse(text) } catch { return null } }
const find = (files, re) => Object.entries(files).filter(([p]) => re.test(p))
const recentFirst = (a, b) => String(b.date ?? '').localeCompare(String(a.date ?? ''))
const day = (d) => { const t = new Date(d); return isNaN(t) ? null : t.toISOString().slice(0, 10) }

// Minimal CSV parser (quoted fields, commas and newlines inside quotes).
export function parseCsv(text) {
  const rows = []; let row = [], field = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"' && text[i + 1] === '"') { field += '"'; i++ } else if (c === '"') q = false; else field += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  const [head, ...body] = rows.filter(r => r.some(Boolean))
  return body.map(r => Object.fromEntries((head ?? []).map((h, i) => [h.trim(), r[i] ?? ''])))
}

export const importers = {
  spotify({ files }) {
    const plays = find(files, /(StreamingHistory|Streaming_History_Audio)[^/]*\.json$/i).flatMap(([, t]) => json(t) ?? [])
    if (!plays.length) return null
    const norm = plays.map(p => ({
      date: day(p.endTime ?? p.ts), ms: p.msPlayed ?? p.ms_played ?? 0,
      artist: p.artistName ?? p.master_metadata_album_artist_name, track: p.trackName ?? p.master_metadata_track_name,
    })).filter(p => p.artist && p.date)
    const last = norm.map(p => p.date).sort().at(-1)
    const weekAgo = new Date(new Date(last).getTime() - 7 * 864e5).toISOString().slice(0, 10)
    const hours = (xs) => Math.round(xs.reduce((s, p) => s + p.ms, 0) / 36e5 * 10) / 10
    const msBy = (key) => norm.reduce((c, p) => { c[key(p)] = (c[key(p)] || 0) + p.ms; return c }, {})
    const toHours = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v / 36e5 * 10) / 10]))
    return {
      platform: 'Spotify', range: [norm.map(p => p.date).sort()[0], last],
      stats: { 'Hours listened': hours(norm), 'Hours in the last week': hours(norm.filter(p => p.date > weekAgo)), Plays: norm.length },
      lists: {
        'Top artists (hours)': top(toHours(msBy(p => p.artist))),
        'Top tracks (hours)': top(toHours(msBy(p => `${p.track} — ${p.artist}`))),
      },
    }
  },

  youtube({ files }) {
    const hist = find(files, /watch-history\.json$/i).flatMap(([, t]) => json(t) ?? [])
    if (!hist.length) return null
    const vids = hist.filter(v => v.titleUrl && v.title).map(v => ({
      date: v.time, title: v.title.replace(/^Watched /, ''), url: v.titleUrl, channel: v.subtitles?.[0]?.name,
    })).sort(recentFirst)
    return {
      platform: 'YouTube', range: [day(vids.at(-1)?.date), day(vids[0]?.date)],
      stats: { 'Videos watched': vids.length },
      lists: { 'Top channels': top(tally(vids, v => v.channel)) },
      recent: vids.slice(0, 25).map(v => ({ date: day(v.date), title: v.title, url: v.url, by: v.channel })),
    }
  },

  instagram({ files }) {
    const pick = (re, key) => find(files, re).flatMap(([, t]) => { const d = json(t); return (Array.isArray(d) ? d : d?.[key]) ?? [] })
    const liked = pick(/liked_posts\.json$/i, 'likes_media_likes')
    const saved = pick(/saved_posts\.json$/i, 'saved_saved_media')
    if (!liked.length && !saved.length) return null
    const entry = (x) => {
      const s = x.string_list_data?.[0] ?? x.string_map_data?.['Saved on'] ?? {}
      return { by: x.title, url: s.href, date: s.timestamp ? new Date(s.timestamp * 1000).toISOString() : null }
    }
    const savedItems = saved.map(entry).sort(recentFirst)
    return {
      platform: 'Instagram',
      stats: { 'Posts liked': liked.length, 'Posts saved': saved.length },
      lists: { 'Accounts you like most': top(tally(liked.map(entry), e => e.by)) },
      recent: savedItems.slice(0, 25).map(e => ({ date: day(e.date), title: `Saved post by ${e.by ?? 'unknown'}`, url: e.url, by: e.by })),
    }
  },

  tiktok({ files }) {
    const data = find(files, /user_data(_tiktok)?\.json$/i).map(([, t]) => json(t)).find(Boolean)
    if (!data) return null
    const act = data.Activity ?? data['Your Activity'] ?? {}
    const watched = act['Video Browsing History']?.VideoList ?? act['Watch History']?.VideoList ?? []
    const likes = act['Like List']?.ItemFavoriteList ?? act['Like List']?.likeList ?? []
    const favs = act['Favorite Videos']?.FavoriteVideoList ?? []
    if (!watched.length && !likes.length) return null
    const days = new Set(watched.map(v => day(v.Date ?? v.date)).filter(Boolean))
    return {
      platform: 'TikTok',
      stats: {
        'Videos watched': watched.length, 'Videos liked': likes.length, Favorites: favs.length,
        'Videos per active day': days.size ? Math.round(watched.length / days.size) : 0,
      },
      recent: favs.slice(0, 25).map(v => ({ date: day(v.Date ?? v.date), title: 'Favorite video', url: v.Link ?? v.link })),
    }
  },

  x({ files }) {
    const raw = find(files, /(^|\/)tweets?\.js$/i).map(([, t]) => t)[0]
    if (!raw) return null
    const tweets = (json(raw.replace(/^[^=]*=\s*/, '')) ?? []).map(x => x.tweet ?? x)
      .map(t => ({ date: t.created_at, text: t.full_text ?? t.text ?? '' })).sort((a, b) => new Date(b.date) - new Date(a.date))
    if (!tweets.length) return null
    const tags = tally(tweets.flatMap(t => t.text.match(/#\w+/g) ?? []), t => t.toLowerCase())
    return {
      platform: 'X', stats: { Posts: tweets.length },
      lists: { 'Hashtags you use': top(tags) },
      recent: tweets.slice(0, 20).map(t => ({ date: day(t.date), title: t.text.slice(0, 140) })),
    }
  },

  reddit({ files }) {
    const csv = (re) => find(files, re).flatMap(([, t]) => parseCsv(t))
    const saved = csv(/saved_posts\.csv$/i), comments = csv(/(^|\/)comments\.csv$/i), posts = csv(/(^|\/)posts\.csv$/i)
    if (!saved.length && !comments.length && !posts.length) return null
    const sub = (r) => r.subreddit || r.permalink?.match(/\/r\/([^/]+)/)?.[1]
    return {
      platform: 'Reddit',
      stats: { 'Saved posts': saved.length, Comments: comments.length, Posts: posts.length },
      lists: { 'Subreddits you comment in': top(tally(comments, sub)) },
      recent: saved.slice(0, 25).map(r => ({ title: `Saved from r/${sub(r) ?? '?'}`, url: r.permalink })),
    }
  },
}

// Runs every importer on one export and returns the summaries it recognised.
export function summarize(files) {
  return Object.values(importers).map(fn => fn({ files })).filter(Boolean)
}
