import { useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageCircle, X } from 'lucide-react'

const SNAP_OFFSET = 24

const cornerStyle = (corner) => {
  switch (corner) {
    case 'top-left':     return { top: SNAP_OFFSET, left: SNAP_OFFSET }
    case 'top-right':    return { top: SNAP_OFFSET, right: SNAP_OFFSET }
    case 'bottom-left':  return { bottom: SNAP_OFFSET, left: SNAP_OFFSET }
    case 'bottom-right':
    default:             return { bottom: SNAP_OFFSET, right: SNAP_OFFSET }
  }
}

const nearestCorner = (x, y) => {
  const midX = window.innerWidth / 2
  const midY = window.innerHeight / 2
  return `${y < midY ? 'top' : 'bottom'}-${x < midX ? 'left' : 'right'}`
}

export default function ChatButton({ isOpen, onClick, corner, onCornerChange }) {
  const location = useLocation()
  const [dragPos, setDragPos] = useState(null)
  const btnRef = useRef(null)
  const startRef = useRef(null)
  const movedRef = useRef(false)

  if (location.pathname === '/chat') return null

  const handlePointerDown = (e) => {
    e.preventDefault()
    btnRef.current.setPointerCapture(e.pointerId)
    startRef.current = { x: e.clientX, y: e.clientY }
    movedRef.current = false
    setDragPos({ x: e.clientX, y: e.clientY })
  }

  const handlePointerMove = (e) => {
    if (!startRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true
    setDragPos({ x: e.clientX, y: e.clientY })
  }

  const handlePointerUp = (e) => {
    startRef.current = null
    setDragPos(null)
    if (movedRef.current) {
      const c = nearestCorner(e.clientX, e.clientY)
      onCornerChange(c)
      localStorage.setItem('chat-fab-corner', c)
    } else {
      onClick()
    }
  }

  const style = dragPos
    ? { position: 'fixed', left: dragPos.x - 28, top: dragPos.y - 28, zIndex: 50 }
    : { position: 'fixed', ...cornerStyle(corner), zIndex: 50 }

  return (
    <button
      ref={btnRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={style}
      className={`flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors select-none ${dragPos ? 'cursor-grabbing' : 'cursor-grab'}`}
      aria-label={isOpen ? 'Close chat' : 'Open AI Assistant'}
    >
      <span className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : 'rotate-0'}`}>
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </span>
    </button>
  )
}
