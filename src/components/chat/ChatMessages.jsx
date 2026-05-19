import { useEffect, useRef } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function LoadingDots({ isWorking }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm">
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
      </div>
      {isWorking && <span>working...</span>}
    </div>
  )
}

const markdownComponents = {
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  th: ({ children }) => (
    <th className="px-3 py-1.5 text-left font-semibold border-b border-border bg-background/50">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-1.5 border-t border-border">{children}</td>
  ),
}

export default function ChatMessages({ messages, isLoading, isWorking, error }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground text-sm text-center">
          Ask me anything about your workouts, or say "log bench press 4x8 at 135 lbs"
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm break-words ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-sm whitespace-pre-wrap'
                : 'bg-muted text-foreground rounded-bl-sm prose prose-sm prose-neutral dark:prose-invert max-w-none'
            }`}
          >
            {msg.role === 'user' ? msg.content : (
              <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{msg.content}</Markdown>
            )}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
            <LoadingDots isWorking={isWorking} />
          </div>
        </div>
      )}

      {error && (
        <div className="flex justify-start">
          <div className="bg-destructive/10 text-destructive rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm max-w-[85%]">
            {error}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
