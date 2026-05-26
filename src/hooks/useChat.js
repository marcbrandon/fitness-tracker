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
  const [sessionLog, setSessionLog] = useState([]) // exercises confirmed logged this session

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

CRITICAL: Never tell the user you have logged, saved, updated, or deleted anything unless a tool call has already succeeded and returned a success response. Do not describe taking an action as a substitute for actually taking it. If you have not made the tool call yet, make it — do not narrate it.

Exercises have three types — always respect the type when logging and comparing:
- weighted: sets/reps/weight. Higher weight = better PR.
- timed: sets/seconds (stored in the reps field). More seconds = better PR. Do not log weight.
- assisted: sets/reps/weight (machine-assisted). Lower weight = less assistance = better PR.

When logging workouts, call log_workout as soon as the user provides an exercise — do not wait for the full workout. Each log_workout call must contain only the exercise(s) from the user's current message — never include exercises from earlier in the conversation. Always include the sets field — default to 1 if not stated. When the user says "same again", "another set", or similar, log a new entry with the same exercise_name, sets, reps, and weight as the most recently logged entry. If an exercise doesn't exist, create it with add_exercise first, then proceed. Only ask for the muscle group if context gives no clue.

When updating a workout entry to use a different exercise that doesn't exist yet, create it with add_exercise first, then retry the update.

When the user indicates they are starting a workout by naming a routine (e.g. "Push day", "leg day", "pull"), do all of the following in a single response:
1. Call log_workout for today's date with the appropriate routine value (Core, Legs, Push, Pull, or Shoulders) and no entries yet.
2. Call get_recent_workouts with that routine filter (limit 2) to fetch the last session for that routine.
3. Reply with a confirmation that today's workout has been created, then a table showing the exercises from the previous session (Exercise | Sets | Reps | Weight | Volume), where Volume = sets × reps × weight.

When the user mentions an exercise name during a workout session:
- If you already fetched the previous session (e.g. from the routine start), look up that exercise in the data you already have — do not fetch again.
- If you do not have recent history for this exercise, call get_recent_workouts with the current routine filter (or no filter if no routine is set) before logging.
- Call get_exercise_pr for the exercise if you don't already know the PR from earlier in this session.
- CRITICAL: Never call log_workout in the same response as get_recent_workouts or get_exercise_pr. Always fetch data first, then call log_workout in the next response after you have the results.
- Before logging the entry, show a one-row table of the last time they did this exercise: Exercise | Sets | Reps | Weight | Volume. Use only workouts from a previous date — never count today's existing entries as "last session."
- After calling log_workout, append a running volume comparison for that exercise: "Last session: Xlbs total — This session so far: Ylbs total". Compute "this session so far" only from log_workout calls made during this conversation — do not re-query the database.
- If the logged weight exceeds the all-time PR, congratulate the user on the new record.
- Volume for multi-set exercises means the sum of (sets × reps × weight) across all entries for that exercise in the session.

Be concise. Confirm only after tool calls succeed.`
  }, [])

  const buildSessionContext = useCallback((log) => {
    if (!log.length) return null
    const lines = log.map((e) => {
      const parts = [`${e.sets}x${e.reps}`]
      if (e.weight) parts.push(`@ ${e.weight}lbs`)
      return `- ${e.exercise_name}: ${parts.join(' ')}`
    })
    return `Exercises already logged to today's workout — do not re-log these:\n${lines.join('\n')}`
  }, [])

  const initChat = useCallback(() => {
    if (systemPrompt) return // Already initialized
    setSystemPrompt(buildSystemPrompt())
  }, [systemPrompt, buildSystemPrompt])

  const clearChat = useCallback(() => {
    setMessages([])
    setApiMessages([])
    setError(null)
    setSessionLog([])
    setSystemPrompt(buildSystemPrompt())
  }, [buildSystemPrompt])

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isLoading) return

    const newDisplayMessages = [...messages, { role: 'user', content: text.trim() }]

    // Keep a sliding window of the last 8 messages (4 turns) to prevent
    // long conversation drift from overriding system prompt instructions
    const trimmedHistory = apiMessages.slice(-8)
    const newApiMessages = [...trimmedHistory, { role: 'user', content: text.trim() }]

    setMessages(newDisplayMessages)
    setApiMessages(newApiMessages)
    setIsLoading(true)
    setError(null)

    let currentApiMessages = newApiMessages
    let currentSessionLog = sessionLog

    try {
      // Tool-use loop
      while (true) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

        // Build system blocks: static (cached) + dynamic session log (uncached)
        const systemBlocks = [
          { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
        ]
        const sessionContext = buildSessionContext(currentSessionLog)
        if (sessionContext) {
          systemBlocks.push({ type: 'text', text: sessionContext })
        }

        const res = await fetch(`${supabaseUrl}/functions/v1/claude-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            system: systemBlocks,
            messages: currentApiMessages,
            tools: TOOL_DEFINITIONS,
            temperature: 0.2,
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

          // Execute tool_use blocks: run all non-log_workout tools first (in parallel),
          // then run log_workout tools after. This guarantees DB reads complete before
          // any writes, preventing get_recent_workouts from racing with log_workout and
          // returning the just-inserted entry alongside previous-session data.
          const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use')
          const runBlock = async (block) => {
            const result = await executeTool(block.name, block.input)
            return {
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
              _block: block,
            }
          }
          const readBlocks = toolUseBlocks.filter((b) => b.name !== 'log_workout')
          const writeBlocks = toolUseBlocks.filter((b) => b.name === 'log_workout')
          const readResults = await Promise.all(readBlocks.map(runBlock))
          const writeResults = await Promise.all(writeBlocks.map(runBlock))
          const toolResults = [...readResults, ...writeResults]

          // Update session log for successful log_workout calls
          const newEntries = []
          for (const tr of toolResults) {
            const result = JSON.parse(tr.content)
            if (tr._block.name === 'log_workout' && result.success) {
              for (const entry of tr._block.input.entries ?? []) {
                newEntries.push({
                  exercise_name: entry.exercise_name,
                  sets: entry.sets ?? 1,
                  reps: entry.reps,
                  weight: entry.weight,
                })
              }
            }
          }
          if (newEntries.length) {
            currentSessionLog = [...currentSessionLog, ...newEntries]
            setSessionLog(currentSessionLog)
          }

          // Strip internal _block before sending to API
          const cleanToolResults = toolResults.map(({ _block, ...rest }) => rest)

          // Append tool results as user message
          currentApiMessages = [
            ...currentApiMessages,
            { role: 'user', content: cleanToolResults },
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
  }, [messages, apiMessages, isLoading, systemPrompt, sessionLog, buildSessionContext])

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
