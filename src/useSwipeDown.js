import { useRef } from 'react'

// Phone gesture: drag a panel down by its top area to close it. Returns props to spread on the handle.
export default function useSwipeDown(onClose, distance = 80) {
  const start = useRef(null)
  return {
    onTouchStart: (e) => { start.current = e.touches[0].clientY },
    onTouchEnd: (e) => {
      if (start.current !== null && e.changedTouches[0].clientY - start.current > distance) onClose()
      start.current = null
    },
  }
}
