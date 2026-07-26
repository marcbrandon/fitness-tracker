import { useState, useEffect } from 'react'
import { useChat } from './useChat'
import { ChatContext } from './useChatContext'

export function ChatProvider({ children }) {
  const chat = useChat()
  // Persist open state so a reload (e.g. iOS reloading the home-screen app after
  // backgrounding) restores the panel exactly as the user left it.
  const [chatOpen, setChatOpen] = useState(
    () => localStorage.getItem('fitness-chat-open') === 'true'
  )
  const [corner, setCorner] = useState(
    () => localStorage.getItem('chat-fab-corner') ?? 'bottom-right'
  )
  const [previousPath, setPreviousPath] = useState('/')

  useEffect(() => {
    try {
      localStorage.setItem('fitness-chat-open', String(chatOpen))
    } catch {
      // storage unavailable — non-fatal
    }
  }, [chatOpen])

  return (
    <ChatContext.Provider value={{ ...chat, chatOpen, setChatOpen, corner, setCorner, previousPath, setPreviousPath }}>
      {children}
    </ChatContext.Provider>
  )
}
