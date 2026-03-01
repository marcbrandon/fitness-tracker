import { createContext, useContext, useState } from 'react'
import { useChat } from './useChat'

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const chat = useChat()
  const [chatOpen, setChatOpen] = useState(false)
  const [corner, setCorner] = useState(
    () => localStorage.getItem('chat-fab-corner') ?? 'bottom-right'
  )
  const [previousPath, setPreviousPath] = useState('/')

  return (
    <ChatContext.Provider value={{ ...chat, chatOpen, setChatOpen, corner, setCorner, previousPath, setPreviousPath }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  return useContext(ChatContext)
}
