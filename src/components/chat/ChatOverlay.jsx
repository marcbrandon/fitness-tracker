import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Expand, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ChatMessages from './ChatMessages'
import ChatInput from './ChatInput'

// FAB is 56px tall, 24px from edge, 8px gap → overlay starts 88px from edge
const OVERLAY_OFFSET = 24 + 56 + 8

const desktopStyle = (corner) => {
  const isTop = corner.startsWith('top')
  const isLeft = corner.endsWith('left')
  return {
    ...(isTop    ? { top: OVERLAY_OFFSET }    : { bottom: OVERLAY_OFFSET }),
    ...(isLeft   ? { left: 24 }              : { right: 24 }),
  }
}

export default function ChatOverlay({ isOpen, onClose, chat, corner }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { messages, isLoading, isWorking, error, initChat, clearChat, sendMessage, setPreviousPath } = chat

  useEffect(() => {
    if (isOpen) initChat()
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null

  const handleExpand = () => {
    setPreviousPath(location.pathname)
    onClose()
    navigate('/chat')
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 sm:hidden"
        onClick={onClose}
      />

      {/* Overlay panel — mobile: bottom sheet; desktop: floats near FAB */}
      <div
        className="fixed z-50 flex flex-col bg-background border shadow-xl bottom-0 left-0 right-0 h-[70vh] rounded-t-2xl sm:left-auto sm:right-auto sm:bottom-auto sm:w-96 sm:h-[500px] sm:rounded-2xl"
        style={window.innerWidth >= 640 ? desktopStyle(corner) : undefined}
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
