import { describe, it, expect } from 'vitest'
import { similarPairs, tokens } from '../lib/similar.js'

const node = (id, body, tags = []) => ({ id, title: id, tags, body })

describe('tokens', () => {
  it('drops stopwords, math, links syntax and URLs', () => {
    expect(tokens('The beta of a stock $\\beta = 1$ see [[Market Risk]] https://x.com/y')).toEqual(['beta', 'stock', 'market', 'risk'])
  })
})

describe('similarPairs', () => {
  const nodes = [
    node('Beta', 'Beta measures how a stock moves with the market. Systematic risk, covariance, variance.'),
    node('Systematic Risk', 'Risk from the market that diversification cannot remove. Beta measures it.'),
    node('Cramr', 'A React app for students: deadlines, grades, study timer, Canvas sync.'),
    node('Arnav\'s Brain', 'A React app that maps notes in 3D; deadlines and email in a daily briefing.'),
  ]
  const pairs = similarPairs(nodes, { min: 0.05 })
  const has = (a, b) => pairs.some(p => (p.a === a && p.b === b) || (p.a === b && p.b === a))
  it('pairs notes about the same thing', () => {
    expect(has('Beta', 'Systematic Risk')).toBe(true)
    expect(has('Cramr', "Arnav's Brain")).toBe(true)
  })
  it('does not pair unrelated notes, and lists each pair once', () => {
    expect(has('Beta', 'Cramr')).toBe(false)
    const keys = pairs.map(p => [p.a, p.b].sort().join('|'))
    expect(new Set(keys).size).toBe(keys.length)
  })
})
