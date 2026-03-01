import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minimize2, Trash2 } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import ChatMessages from '@/components/chat/ChatMessages'
import ChatInput from '@/components/chat/ChatInput'
import { useChatContext } from '@/hooks/useChatContext'

export default function ChatPage() {
  const navigate = useNavigate()
  const { messages, isLoading, isWorking, error, initChat, clearChat, sendMessage, previousPath, setChatOpen } = useChatContext()

  useEffect(() => {
    initChat()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCollapse = () => {
    setChatOpen(true)
    navigate(previousPath || '/')
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">AI Assistant</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCollapse} className="gap-2">
              <Minimize2 className="h-4 w-4" />
              Collapse
            </Button>
            <Button variant="ghost" size="sm" onClick={clearChat} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col border rounded-2xl bg-background overflow-hidden">
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            isWorking={isWorking}
            error={error}
          />
          <ChatInput onSend={sendMessage} isLoading={isLoading} />
        </div>
      </div>
    </Layout>
  )
}
