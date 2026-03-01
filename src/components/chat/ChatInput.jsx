import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { SendHorizontal } from 'lucide-react'

export default function ChatInput({ onSend, isLoading }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [text])

  const handleSubmit = () => {
    if (!text.trim() || isLoading) return
    onSend(text.trim())
    setText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t bg-background p-3 flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message AI Assistant..."
        disabled={isLoading}
        rows={1}
        className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 overflow-hidden text-base sm:text-sm"
        style={{ maxHeight: '120px' }}
      />
      <Button
        size="icon"
        onClick={handleSubmit}
        disabled={!text.trim() || isLoading}
        className="shrink-0 rounded-xl"
      >
        <SendHorizontal className="h-4 w-4" />
      </Button>
    </div>
  )
}
