import { useLocation } from 'react-router-dom'
import { MessageCircle, X } from 'lucide-react'

export default function ChatButton({ isOpen, onClick }) {
  const location = useLocation()

  // Hide FAB on the full /chat page
  if (location.pathname === '/chat') return null

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200"
      aria-label={isOpen ? 'Close chat' : 'Open AI Assistant'}
    >
      <span
        className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : 'rotate-0'}`}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </span>
    </button>
  )
}
