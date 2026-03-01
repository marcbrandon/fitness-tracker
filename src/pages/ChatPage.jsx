import { useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import ChatMessages from '@/components/chat/ChatMessages'
import ChatInput from '@/components/chat/ChatInput'
import { useChat } from '@/hooks/useChat'

export default function ChatPage() {
  const chat = useChat()
  const { messages, isLoading, isWorking, error, initChat, clearChat, sendMessage } = chat

  useEffect(() => {
    initChat()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Layout>
      <div className="max-w-2xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">AI Assistant</h1>
          <Button variant="ghost" size="sm" onClick={clearChat} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Clear conversation
          </Button>
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
