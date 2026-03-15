import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { TOOL_DEFINITIONS, executeTool } from '@/lib/chatTools'

export function useChat() {
  const [messages, setMessages] = useState([]) // display format: { role, content: string }
  const [apiMessages, setApiMessages] = useState([]) // Anthropic API format
  const [isLoading, setIsLoading] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState(null)
  const [systemPrompt, setSystemPrompt] = useState(null)

  const buildSystemPrompt = useCallback(() => {
    const now = new Date()
    const today = now.toLocaleDateString('en-CA') // YYYY-MM-DD in local time
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    return `You are a personal fitness assistant with read and write access to the user's fitness data. Today's date is ${today} (${timezone}).

You can help the user:
- Log new workouts and exercises
- Review workout history and progress
- Track nutrition
- Answer questions about their fitness data

When logging workouts, log each exercise to the database as soon as the user provides it — do not wait for the full workout to be described. If an exercise doesn't exist in the library, create it automatically with add_exercise (using a sensible muscle group based on context) then proceed — do not ask for confirmation unless the muscle group is genuinely unclear.

When updating a workout entry to use a different exercise that doesn't exist yet, create it with add_exercise first, then retry the update.

Be concise and helpful. When you make changes to the data, confirm what was done.`
  }, [])

  const initChat = useCallback(() => {
    if (systemPrompt) return // Already initialized
    setSystemPrompt(buildSystemPrompt())
  }, [systemPrompt, buildSystemPrompt])

  const clearChat = useCallback(() => {
    setMessages([])
    setApiMessages([])
    setError(null)
    setSystemPrompt(buildSystemPrompt())
  }, [buildSystemPrompt])

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isLoading) return

    const newDisplayMessages = [...messages, { role: 'user', content: text.trim() }]
    const newApiMessages = [...apiMessages, { role: 'user', content: text.trim() }]

    setMessages(newDisplayMessages)
    setApiMessages(newApiMessages)
    setIsLoading(true)
    setError(null)

    let currentApiMessages = newApiMessages

    try {
      // Tool-use loop
      while (true) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

        const res = await fetch(`${supabaseUrl}/functions/v1/claude-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            system: systemPrompt,
            messages: currentApiMessages,
            tools: TOOL_DEFINITIONS,
          }),
        })

        if (!res.ok) {
          const text = await res.text()
          throw new Error(`Function error ${res.status}: ${text}`)
        }

        const data = await res.json()

        if (data.anthropic_status && data.anthropic_status !== 200) {
          throw new Error(`Anthropic error ${data.anthropic_status}: ${data.error?.message ?? JSON.stringify(data)}`)
        }
        if (data.error && !data.type) throw new Error(data.error)

        const response = data

        if (response.stop_reason === 'tool_use') {
          setIsWorking(true)

          // Build assistant message with all content blocks
          const assistantApiMessage = { role: 'assistant', content: response.content }
          currentApiMessages = [...currentApiMessages, assistantApiMessage]

          // Execute all tool_use blocks in parallel
          const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use')
          const toolResults = await Promise.all(
            toolUseBlocks.map(async (block) => {
              const result = await executeTool(block.name, block.input)
              return {
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(result),
              }
            })
          )

          // Append tool results as user message
          currentApiMessages = [
            ...currentApiMessages,
            { role: 'user', content: toolResults },
          ]

          setIsWorking(false)
          // Continue loop for next response
        } else if (response.stop_reason === 'end_turn') {
          // Extract text block and add to display messages
          const textBlock = response.content.find((b) => b.type === 'text')
          const assistantText = textBlock?.text ?? ''

          setMessages((prev) => [...prev, { role: 'assistant', content: assistantText }])
          // Compress: discard intermediate tool use/result pairs — only persist the
          // user's text message and the assistant's final text reply to keep history lean.
          setApiMessages([
            ...apiMessages,
            { role: 'user', content: text.trim() },
            { role: 'assistant', content: assistantText },
          ])
          break
        } else {
          // Unexpected stop reason — still try to extract text
          const textBlock = response.content?.find((b) => b.type === 'text')
          if (textBlock) {
            setMessages((prev) => [...prev, { role: 'assistant', content: textBlock.text }])
          }
          break
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
      setIsWorking(false)
    }
  }, [messages, apiMessages, isLoading, systemPrompt])

  return {
    messages,
    isLoading,
    isWorking,
    error,
    initChat,
    clearChat,
    sendMessage,
  }
}
