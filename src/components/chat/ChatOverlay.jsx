import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Expand, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'

// FAB is 56px tall, 24px from edge, 8px gap → overlay starts 88px from edge
const OVERLAY_OFFSET = 24 + 56 + 8

// Encode corner as CSS custom properties so the responsive rules can be pure
// CSS — this way viewport resizes flip between mobile bottom-sheet and desktop
// float layouts without needing a resize listener.
const cornerStyle = (corner) => {
  const isTop = corner.startsWith('top')
  const isLeft = corner.endsWith('left')
  return {
    '--chat-top': isTop ? `${OVERLAY_OFFSET}px` : 'auto',
    '--chat-bottom': isTop ? 'auto' : `${OVERLAY_OFFSET}px`,
    '--chat-left': isLeft ? '24px' : 'auto',
    '--chat-right': isLeft ? 'auto' : '24px',
  }
}

// Tailwind's sm breakpoint: below it the overlay is a modal bottom sheet.
const DESKTOP_QUERY = '(min-width: 40rem)'
// Touch-first devices, where focusing the message box opens a soft keyboard.
const TOUCH_QUERY = '(pointer: coarse)'
// The sheet's height as a fraction of the screen, matching h-[70vh].
const SHEET_FRACTION = 0.7

// While the mobile sheet is open, track the visual viewport — the part of the
// page not covered by the iOS keyboard. iOS keeps fixed elements attached to
// the full-height layout viewport, so without this the sheet sits behind the
// keyboard and the page shows between them. Returns null on desktop.
function useSheetViewport(active) {
  const [viewport, setViewport] = useState(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!active || !vv) return
    const desktop = window.matchMedia(DESKTOP_QUERY)
    const update = () => {
      setViewport(desktop.matches ? null : {
        top: vv.offsetTop,
        height: vv.height,
      })
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    desktop.addEventListener('change', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      desktop.removeEventListener('change', update)
      setViewport(null)
    }
  }, [active])

  return viewport
}

export default function ChatOverlay({ isOpen, onClose, chat, corner }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { messages, isLoading, isWorking, error, initChat, clearChat, sendMessage, setPreviousPath } = chat

  useEffect(() => {
    if (isOpen) initChat()
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // In the mobile bottom-sheet layout the sheet is modal, so stop the page
  // behind it from scrolling. Lock the root element rather than making <body>
  // a scroll container or position:fixed — either desyncs iOS hit-testing of
  // fixed elements like the chat FAB. The desktop float layout is non-modal
  // and leaves page scrolling alone.
  useEffect(() => {
    if (!isOpen) return
    const root = document.documentElement
    const previous = root.style.overflow
    const desktop = window.matchMedia(DESKTOP_QUERY)

    // With the keyboard up, iOS lets a drag pan the page even when the root
    // is overflow:hidden. Block one-finger drags except inside the message
    // list, and only when it has something to scroll. Pinch zoom still works.
    const blockTouchMove = (e) => {
      if (desktop.matches || e.touches.length > 1) return
      const scroller = e.target.closest?.('[data-chat-scroll]')
      if (scroller && scroller.scrollHeight > scroller.clientHeight) return
      e.preventDefault()
    }

    const apply = () => {
      root.style.overflow = desktop.matches ? previous : 'hidden'
    }
    apply()
    desktop.addEventListener('change', apply)
    document.addEventListener('touchmove', blockTouchMove, { passive: false })
    return () => {
      desktop.removeEventListener('change', apply)
      document.removeEventListener('touchmove', blockTouchMove)
      root.style.overflow = previous
    }
  }, [isOpen])

  const viewport = useSheetViewport(isOpen)

  // The message box has focus in the mobile layout on a touch device, i.e.
  // the iOS keyboard is up. Window-size checks can't detect the keyboard: iOS may shrink the
  // window along with the visual viewport, by different amounts depending on
  // scroll position.
  const [typing, setTyping] = useState(false)
  // Reset when the sheet closes; blur doesn't reliably fire on unmount.
  if (!isOpen && typing) setTyping(false)

  // The iOS keyboard and its suggestion bar are translucent, and iOS clips
  // fixed elements like this sheet at the bottom of the shrunken window, so
  // page content shows through behind them. While typing, hide the page so
  // only the body background shows there. See html[data-chat-typing] in
  // index.css.
  useEffect(() => {
    if (!typing) return
    const root = document.documentElement
    root.dataset.chatTyping = ''
    return () => {
      delete root.dataset.chatTyping
    }
  }, [typing])

  if (!isOpen) return null

  // Mobile: keep the sheet's bottom at the bottom of the visible area. While
  // typing, fill everything above the keyboard; otherwise use the normal
  // sheet height, shrinking it if the visible area is short.
  let sheetStyle = { paddingBottom: 'env(safe-area-inset-bottom)' }
  if (viewport) {
    const height = typing
      ? viewport.height
      : Math.min(window.innerHeight * SHEET_FRACTION, viewport.height)
    sheetStyle = {
      top: viewport.top + viewport.height - height,
      bottom: 'auto',
      height,
      // The keyboard covers the home indicator, so drop the safe-area gap.
      paddingBottom: typing ? 0 : 'env(safe-area-inset-bottom)',
    }
  }

  const handleFocus = (e) => {
    if (
      e.target.tagName === 'TEXTAREA' &&
      !window.matchMedia(DESKTOP_QUERY).matches &&
      window.matchMedia(TOUCH_QUERY).matches
    ) {
      setTyping(true)
    }
  }
  // Keep focus in the message box when a sheet button is pressed. Otherwise
  // the blur ends typing mode and resizes the sheet before the click lands,
  // so the click misses (e.g. Send). It also keeps the keyboard up after Send.
  const handleMouseDown = (e) => {
    if (e.target.closest('button')) e.preventDefault()
  }
  const handleBlur = (e) => {
    if (e.target.tagName === 'TEXTAREA') setTyping(false)
  }

  const handleExpand = () => {
    setPreviousPath(location.pathname)
    onClose()
    navigate('/chat')
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 touch-none sm:hidden"
        onClick={onClose}
      />

      {/* Overlay panel — mobile: bottom sheet; desktop: floats near FAB */}
      <div
        className="fixed z-50 flex flex-col bg-background border border-b-0 sm:border-b shadow-xl bottom-0 left-0 right-0 h-[70vh] rounded-t-2xl sm:left-[var(--chat-left)] sm:right-[var(--chat-right)] sm:top-[var(--chat-top)] sm:bottom-[var(--chat-bottom)] sm:w-96 sm:h-[500px] sm:rounded-2xl"
        style={{ ...cornerStyle(corner), ...sheetStyle }}
        data-chat-sheet
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <span className="font-semibold text-sm">AI Assistant</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearChat} title="Clear conversation">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExpand} title="Open full page">
              <Expand className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} title="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ChatMessages messages={messages} isLoading={isLoading} isWorking={isWorking} error={error} />
        <ChatInput onSend={sendMessage} isLoading={isLoading} />
      </div>
    </>
  )
}
