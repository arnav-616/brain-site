import { describe, it, expect } from 'vitest'
import { summarize, parseCsv, importers } from '../lib/importers.js'

describe('spotify', () => {
  const files = {
    'Spotify/StreamingHistory_music_0.json': JSON.stringify([
      { endTime: '2026-10-01 10:00', artistName: 'A', trackName: 'Song 1', msPlayed: 3600000 },
      { endTime: '2026-10-19 10:00', artistName: 'B', trackName: 'Song 2', msPlayed: 1800000 },
      { endTime: '2026-10-20 10:00', artistName: 'B', trackName: 'Song 2', msPlayed: 3600000 },
    ]),
  }
  const s = importers.spotify({ files })
  it('totals listening time and the last week', () => {
    expect(s.stats['Hours listened']).toBe(2.5)
    expect(s.stats['Hours in the last week']).toBe(1.5)
  })
  it('ranks artists by time', () => {
    expect(s.lists['Top artists (hours)'][0]).toEqual({ name: 'B', count: 1.5 })
  })
})

describe('youtube', () => {
  it('reads Takeout watch history', () => {
    const s = importers.youtube({ files: { 'Takeout/YouTube/history/watch-history.json': JSON.stringify([
      { title: 'Watched CAPM explained', titleUrl: 'https://youtu.be/1', time: '2026-10-19T10:00:00Z', subtitles: [{ name: 'Finance Ch' }] },
      { title: 'Watched Beta in 5 min', titleUrl: 'https://youtu.be/2', time: '2026-10-20T10:00:00Z', subtitles: [{ name: 'Finance Ch' }] },
      { title: 'Visited an ad', time: '2026-10-20T11:00:00Z' },
    ]) } })
    expect(s.stats['Videos watched']).toBe(2)
    expect(s.lists['Top channels'][0]).toEqual({ name: 'Finance Ch', count: 2 })
    expect(s.recent[0].title).toBe('Beta in 5 min')
  })
})

describe('instagram', () => {
  it('counts likes and lists saved posts', () => {
    const s = importers.instagram({ files: {
      'your_instagram_activity/likes/liked_posts.json': JSON.stringify({ likes_media_likes: [
        { title: 'friend', string_list_data: [{ href: 'https://instagram.com/p/1', timestamp: 1792000000 }] },
        { title: 'friend', string_list_data: [{ href: 'https://instagram.com/p/2', timestamp: 1792000100 }] },
      ] }),
      'your_instagram_activity/saved/saved_posts.json': JSON.stringify({ saved_saved_media: [
        { title: 'chef', string_map_data: { 'Saved on': { href: 'https://instagram.com/p/3', timestamp: 1792000200 } } },
      ] }),
    } })
    expect(s.stats).toEqual({ 'Posts liked': 2, 'Posts saved': 1 })
    expect(s.lists['Accounts you like most'][0]).toEqual({ name: 'friend', count: 2 })
    expect(s.recent[0].url).toBe('https://instagram.com/p/3')
  })
})

describe('tiktok', () => {
  it('reads watch history and likes', () => {
    const s = importers.tiktok({ files: { 'user_data_tiktok.json': JSON.stringify({ Activity: {
      'Video Browsing History': { VideoList: [{ Date: '2026-10-19 10:00:00', Link: 'a' }, { Date: '2026-10-19 11:00:00', Link: 'b' }, { Date: '2026-10-20 10:00:00', Link: 'c' }] },
      'Like List': { ItemFavoriteList: [{ date: '2026-10-19', link: 'a' }] },
    } }) } })
    expect(s.stats['Videos watched']).toBe(3)
    expect(s.stats['Videos liked']).toBe(1)
    expect(s.stats['Videos per active day']).toBe(2)
  })
})

describe('x', () => {
  it('parses the tweets.js wrapper', () => {
    const s = importers.x({ files: { 'data/tweets.js': 'window.YTD.tweets.part0 = ' + JSON.stringify([
      { tweet: { created_at: 'Mon Oct 19 10:00:00 +0000 2026', full_text: 'learning #finance today' } },
      { tweet: { created_at: 'Tue Oct 20 10:00:00 +0000 2026', full_text: 'built a #3d brain #finance' } },
    ]) } })
    expect(s.stats.Posts).toBe(2)
    expect(s.lists['Hashtags you use'][0]).toEqual({ name: '#finance', count: 2 })
    expect(s.recent[0].title).toContain('3d brain')
  })
})

describe('reddit', () => {
  it('reads CSV exports, including quoted commas', () => {
    expect(parseCsv('a,b\n"x, y",2\n')).toEqual([{ a: 'x, y', b: '2' }])
    const s = importers.reddit({ files: {
      'saved_posts.csv': 'id,permalink\n1,https://www.reddit.com/r/investing/comments/1/x/\n',
      'comments.csv': 'id,subreddit,body\n1,cs,"hi, there"\n2,cs,yo\n',
    } })
    expect(s.stats).toEqual({ 'Saved posts': 1, Comments: 2, Posts: 0 })
    expect(s.lists['Subreddits you comment in'][0]).toEqual({ name: 'cs', count: 2 })
    expect(s.recent[0].title).toBe('Saved from r/investing')
  })
})

describe('summarize', () => {
  it('ignores folders that are not a known export', () => {
    expect(summarize({ 'random.json': '{}' })).toEqual([])
  })
})
