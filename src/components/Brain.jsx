import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import {
  AdditiveBlending, BufferGeometry, CanvasTexture, Float32BufferAttribute, Points, PointsMaterial, Sprite, SpriteMaterial, Vector2,
} from 'three'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { colorOf } from '../theme'

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

export default function Brain({ data, topics, selectedId, highlightIds, onSelect }) {
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
    const bloom = new UnrealBloomPass(new Vector2(window.innerWidth, window.innerHeight), 0.75, 0.5, 0.15)
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
    const dist = 140
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
      nodeLabel={n => `<div class="node-label">${escapeHtml(n.title)}</div>`}
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
      onEngineStop={() => {
        // Frame the whole brain once, after the layout first settles.
        if (!fitted.current) { fitted.current = true; fg.current.zoomToFit(900, 140) }
      }}
    />
  )
}

const escapeHtml = (s) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
