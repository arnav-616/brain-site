import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import {
  AdditiveBlending, BufferGeometry, CanvasTexture, Float32BufferAttribute, Points, PointsMaterial, Sprite, SpriteMaterial, Vector2,
} from 'three'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { colorOf } from '../theme'
import { summaryOf } from '../../lib/showcase.js'

// The bloom pass gamma-encodes the scene a second time, so the clear color is pre-darkened:
// this renders on screen close to the page background (#070818).
const BG = '#000103'
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// A soft radial gradient, shared by every node's glow halo.
const glowTexture = (() => {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,0.6)')
  g.addColorStop(0.3, 'rgba(255,255,255,0.14)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new CanvasTexture(c)
})()

// Faint distant stars so the brain floats in space instead of on a flat color.
function starfield() {
  const pos = []
  for (let i = 0; i < 1800; i++) {
    const r = 900 + Math.random() * 1600
    const t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1)
    pos.push(r * Math.sin(p) * Math.cos(t), r * Math.sin(p) * Math.sin(t), r * Math.cos(p))
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  return new Points(geo, new PointsMaterial({ color: '#8f9bff', size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.55 }))
}

const endId = (end) => end.id ?? end

// Soft floating label for a topic region, drawn once to a canvas.
function textSprite(text, color) {
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')
  const font = '600 64px Unbounded, Manrope, sans-serif'
  ctx.font = font
  c.width = Math.ceil(ctx.measureText(text).width) + 40
  c.height = 96
  ctx.font = font
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 20, 48)
  // Constant on-screen size, so labels stay readable far away and don't swamp the view up close.
  const sprite = new Sprite(new SpriteMaterial({ map: new CanvasTexture(c), transparent: true, opacity: 0.5, depthWrite: false, sizeAttenuation: false }))
  const h = 0.045
  sprite.scale.set(h * c.width / c.height, h, 1)
  return sprite
}

// Gives every topic its own region of space (evenly spread on a sphere) and pulls each note
// toward its topic's region, so topics read as separate galaxies.
function clusterForce(topicList) {
  let nodes = []
  const R = 90 + 25 * topicList.length
  const anchors = new Map(topicList.map((t, i) => {
    const y = topicList.length === 1 ? 0 : 1 - (2 * i) / (topicList.length - 1)
    const r = Math.sqrt(1 - y * y), phi = i * Math.PI * (3 - Math.sqrt(5))
    return [t, { x: Math.cos(phi) * r * R, y: y * R * 0.7, z: Math.sin(phi) * r * R }]
  }))
  const force = (alpha) => {
    for (const n of nodes) {
      const a = n.topic && anchors.get(n.topic)
      if (!a) continue
      n.vx += (a.x - n.x) * alpha * 0.08
      n.vy += (a.y - n.y) * alpha * 0.08
      n.vz += (a.z - n.z) * alpha * 0.08
    }
  }
  force.initialize = (n) => { nodes = n }
  return force
}

export default function Brain({ data, topics, selectedId, highlightIds, onSelect, viewShift = 0, similar = [], byMeaning = false }) {
  const fg = useRef()
  const fitted = useRef(false)
  const [hover, setHover] = useState(null)
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // One-time scene setup: bloom, stars, and a slow spin until the user touches it.
  useEffect(() => {
    const g = fg.current
    if (!g) return
    const bloom = new UnrealBloomPass(new Vector2(window.innerWidth, window.innerHeight), 0.6, 0.45, 0.2)
    g.postProcessingComposer().addPass(bloom)
    const stars = starfield()
    g.scene().add(stars)
    // Spread notes out, and start close enough that a small brain still fills the view.
    g.d3Force('charge').strength(-110)
    g.d3Force('link').distance(42)
    g.cameraPosition({ x: 0, y: 0, z: 200 + 50 * Math.sqrt(data.nodes.length) })
    const controls = g.controls()
    controls.autoRotate = !reducedMotion
    controls.autoRotateSpeed = 0.5
    const el = g.renderer().domElement
    const stop = () => { controls.autoRotate = false }
    el.addEventListener('pointerdown', stop)
    return () => {
      el.removeEventListener('pointerdown', stop)
      g.postProcessingComposer().removePass(bloom)
      g.scene().remove(stars)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scene setup runs once
  }, [])

  // Topic regions: re-anchor when the set of topics changes.
  useEffect(() => {
    fg.current.d3Force('cluster', clusterForce([...topics.keys()]))
    fg.current.d3ReheatSimulation()
  }, [topics])

  // "Arrange by meaning": springs between notes that use similar words, so related ideas drift
  // together even when they aren't linked.
  useEffect(() => {
    const g = fg.current
    if (!byMeaning) { g.d3Force('meaning', null); g.d3ReheatSimulation(); return }
    let nodes = []
    const force = (alpha) => {
      const byId = new Map(nodes.map(n => [n.id, n]))
      for (const p of similar) {
        const a = byId.get(p.a), b = byId.get(p.b)
        if (!a || !b) continue
        const k = alpha * p.score * 0.6
        for (const ax of ['x', 'y', 'z']) { const d = (b[ax] - a[ax]) * k; a['v' + ax] += d; b['v' + ax] -= d }
      }
    }
    force.initialize = (n) => { nodes = n }
    g.d3Force('meaning', force)
    g.d3Force('cluster', byMeaning ? null : g.d3Force('cluster'))
    g.d3ReheatSimulation()
    return () => { g.d3Force('meaning', null); g.d3Force('cluster', clusterForce([...topics.keys()])) }
  }, [byMeaning, similar, topics])

  // Topic labels float above the middle of each topic's region.
  const labels = useRef(new Map())
  useEffect(() => {
    const scene = fg.current.scene()
    for (const [t, color] of topics) {
      const sprite = textSprite(t, color)
      sprite.visible = false
      labels.current.set(t, sprite)
      scene.add(sprite)
    }
    const current = labels.current
    return () => { for (const sprite of current.values()) scene.remove(sprite); current.clear() }
  }, [topics])
  const placeLabels = () => {
    const sum = {}
    for (const n of data.nodes) {
      if (!n.topic || n.x === undefined) continue
      const s = (sum[n.topic] ??= { x: 0, y: 0, z: 0, top: -Infinity, k: 0 })
      s.x += n.x; s.y += n.y; s.z += n.z; s.k++; s.top = Math.max(s.top, n.y)
    }
    for (const [t, sprite] of labels.current) {
      const s = sum[t]
      sprite.visible = !!s
      if (s) sprite.position.set(s.x / s.k, s.top + 22, s.z / s.k)
    }
  }

  // Keep the brain centred in the free part of the screen (beside panels, not behind them) by
  // sliding the camera's view window. Animated, so opening a panel glides the brain aside.
  const shift = useRef(0)
  useEffect(() => {
    const cam = fg.current?.camera()
    if (!cam) return
    const from = shift.current, start = performance.now(), dur = reducedMotion ? 0 : 600
    let raf
    const step = (t) => {
      const k = dur ? Math.min(1, (t - start) / dur) : 1
      shift.current = from + (viewShift - from) * (1 - Math.pow(1 - k, 3))
      cam.setViewOffset(size.w, size.h, -shift.current, 0, size.w, size.h)
      cam.updateProjectionMatrix()
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [viewShift, size])

  // Notes added in the last day breathe softly so new knowledge stands out.
  useEffect(() => {
    if (reducedMotion) return
    const since = new Date(Date.now() - 864e5).toLocaleDateString('en-CA')
    const fresh = data.nodes.filter(n => n.created && n.created >= since)
    if (!fresh.length) return
    let raf
    const loop = (t) => {
      const k = 1 + 0.35 * Math.sin(t / 450)
      for (const n of fresh) { const g = n.__glow; if (g) g.scale.setScalar(g.userData.base * k) }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [data, topics, highlightIds]) // glow sprites are rebuilt when these change

  // Synapses: every so often a pulse of light runs along a random connection.
  useEffect(() => {
    if (reducedMotion || data.links.length === 0) return
    const id = setInterval(() => {
      const l = data.links[Math.floor(Math.random() * data.links.length)]
      if (typeof l.source === 'object') fg.current?.emitParticle(l)
    }, Math.max(120, 1400 / Math.sqrt(data.links.length)))
    return () => clearInterval(id)
  }, [data])

  const neighbors = useMemo(() => {
    const m = new Map()
    for (const l of data.links) {
      const s = endId(l.source), t = endId(l.target)
      if (!m.has(s)) m.set(s, new Set())
      if (!m.has(t)) m.set(t, new Set())
      m.get(s).add(t); m.get(t).add(s)
    }
    return m
  }, [data])

  // Fly the camera to the selected note.
  useEffect(() => {
    const node = data.nodes.find(n => n.id === selectedId)
    if (!node || node.x === undefined) return
    fg.current.controls().autoRotate = false
    const dist = 230
    const r = 1 + dist / Math.hypot(node.x, node.y, node.z || 1)
    fg.current.cameraPosition({ x: node.x * r, y: node.y * r, z: node.z * r }, node, reducedMotion ? 0 : 1400)
  }, [selectedId, data])

  const focus = hover || selectedId
  const lit = (id) => !focus || id === focus || neighbors.get(focus)?.has(id)
  const linkLit = (l) => focus && (endId(l.source) === focus || endId(l.target) === focus)

  // Glow halos are rebuilt when the highlight set or colors change.
  const glow = useMemo(() => (node) => {
    const sprite = new Sprite(new SpriteMaterial({
      map: glowTexture, color: colorOf(node, topics), blending: AdditiveBlending, depthWrite: false, transparent: true,
    }))
    const boost = highlightIds?.has(node.id) ? 1.7 : 1
    const s = (10 + Math.cbrt(2 + node.degree * 2) * 6) * boost
    sprite.scale.set(s, s, 1)
    sprite.userData.base = s
    node.__glow = sprite
    return sprite
  }, [topics, highlightIds])

  return (
    <ForceGraph3D
      ref={fg}
      width={size.w}
      height={size.h}
      graphData={data}
      controlType="orbit"
      backgroundColor={BG}
      nodeLabel={n => {
        const line = summaryOf(n).replace(/\[\[([^\]|]+)(\|([^\]]*))?\]\]/g, (_, t, _a, alias) => alias || t).replace(/[*_$`]/g, '')
        return `<div class="node-label"><b>${escapeHtml(n.title)}</b>${line ? `<span>${escapeHtml(line.length > 110 ? line.slice(0, 107) + '…' : line)}</span>` : ''}</div>`
      }}
      nodeVal={n => 1.5 + n.degree * 1.5}
      nodeColor={n => (lit(n.id) ? colorOf(n, topics) : '#1a1d3d')}
      nodeOpacity={0.95}
      nodeResolution={20}
      nodeThreeObject={glow}
      nodeThreeObjectExtend
      linkColor={l => (linkLit(l) ? '#E6E9FF' : '#3b4170')}
      linkWidth={l => (linkLit(l) ? 1 : 0.25)}
      linkOpacity={0.45}
      linkDirectionalParticles={l => (linkLit(l) ? 4 : 0)}
      linkDirectionalParticleWidth={1.6}
      linkDirectionalParticleSpeed={0.008}
      linkDirectionalParticleColor={() => '#E6E9FF'}
      onNodeHover={n => { setHover(n?.id ?? null); document.body.style.cursor = n ? 'pointer' : '' }}
      onNodeClick={n => onSelect(n.id)}
      onBackgroundClick={() => onSelect(null)}
      showNavInfo={false}
      cooldownTicks={150}
      onEngineTick={placeLabels}
      onEngineStop={() => {
        placeLabels()
        // Frame the whole brain once, after the layout first settles.
        // Ignore lone unlinked notes so they don't shrink the whole brain to a dot.
        if (!fitted.current) { fitted.current = true; fg.current.zoomToFit(900, 90, n => n.degree > 0) }
      }}
    />
  )
}

const escapeHtml = (s) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
