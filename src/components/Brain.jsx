import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import { AdditiveBlending, CanvasTexture, Sprite, SpriteMaterial } from 'three'
import { colorFor } from '../theme'

// A soft radial gradient, shared by every node's glow halo.
const glowTexture = (() => {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new CanvasTexture(c)
})()

function glow(node) {
  const sprite = new Sprite(new SpriteMaterial({
    map: glowTexture, color: colorFor(node.type), blending: AdditiveBlending, depthWrite: false, transparent: true,
  }))
  const size = 18 + Math.cbrt(2 + node.degree * 2) * 10
  sprite.scale.set(size, size, 1)
  return sprite
}

export default function Brain({ data, selectedId, onSelect }) {
  const fg = useRef()
  const fitted = useRef(false)
  const [hover, setHover] = useState(null)
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Slow spin until the user touches it.
  useEffect(() => {
    const g = fg.current
    if (!g) return
    const controls = g.controls()
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.6
    const el = g.renderer().domElement
    const stop = () => { controls.autoRotate = false }
    el.addEventListener('pointerdown', stop)
    return () => el.removeEventListener('pointerdown', stop)
  }, [])

  const neighbors = useMemo(() => {
    const m = new Map()
    for (const l of data.links) {
      const s = l.source.id ?? l.source, t = l.target.id ?? l.target
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
    const dist = 160
    const r = 1 + dist / Math.hypot(node.x, node.y, node.z || 1)
    fg.current.cameraPosition({ x: node.x * r, y: node.y * r, z: node.z * r }, node, 1200)
  }, [selectedId, data])

  const focus = hover || selectedId
  const lit = (id) => !focus || id === focus || neighbors.get(focus)?.has(id)
  const linkLit = (l) => focus && ((l.source.id ?? l.source) === focus || (l.target.id ?? l.target) === focus)

  return (
    <ForceGraph3D
      ref={fg}
      width={size.w}
      height={size.h}
      graphData={data}
      controlType="orbit"
      backgroundColor="#05060a"
      nodeLabel={n => `<div style="padding:4px 8px;background:#0f172acc;border-radius:6px;font:13px system-ui">${n.title}</div>`}
      nodeVal={n => 2 + n.degree * 2}
      nodeColor={n => (lit(n.id) ? colorFor(n.type) : '#1e293b')}
      nodeOpacity={0.95}
      nodeResolution={16}
      nodeThreeObject={glow}
      nodeThreeObjectExtend
      linkColor={l => (linkLit(l) ? '#e2e8f0' : '#475569')}
      linkWidth={l => (linkLit(l) ? 1.2 : 0.3)}
      linkOpacity={0.5}
      linkDirectionalParticles={l => (linkLit(l) ? 3 : 0)}
      linkDirectionalParticleWidth={1.5}
      onNodeHover={n => { setHover(n?.id ?? null); document.body.style.cursor = n ? 'pointer' : '' }}
      onNodeClick={n => onSelect(n.id)}
      onBackgroundClick={() => onSelect(null)}
      showNavInfo={false}
      cooldownTicks={120}
      onEngineStop={() => {
        // Frame the whole brain once, after the layout settles.
        if (!fitted.current) { fitted.current = true; fg.current.zoomToFit(800, 120) }
      }}
    />
  )
}
