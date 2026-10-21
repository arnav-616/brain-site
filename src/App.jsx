import { lazy, Suspense } from 'react'
import PublicSite from './PublicSite'

// In the public build PRIVATE is false, so the private app is dropped from the bundle entirely.
const PRIVATE = import.meta.env.VITE_GRAPH === 'private'
const LifeApp = PRIVATE ? lazy(() => import('./life/LifeApp')) : null

export default function App() {
  return PRIVATE ? <Suspense fallback={null}><LifeApp /></Suspense> : <PublicSite />
}
