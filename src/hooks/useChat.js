import { useState, useEffect, useCallback } from 'react'
import { TOOL_DEFINITIONS, executeTool } from '@/lib/chatTools'

const MAX_TOOL_ITERATIONS = 10
// History is windowed by user turns (a typed message plus every tool call,
// tool result, and reply it produced) so a whole workout stays in context.
// Tool calls are kept: with text-only history the model saw "Logged!" replies
// with no tool calls behind them and concluded nothing had been logged.
const MAX_HISTORY_TURNS = 40

const isTextTurnStart = (m) => m.role === 'user' && typeof m.content === 'string'

// Trim to the last `turns` user turns, always starting on a typed user message
// so no tool_result is left without its tool_use.
function trimToTurns(history, turns) {
  const starts = []
  history.forEach((m, i) => { if (isTextTurnStart(m)) starts.push(i) })
  if (starts.length <= turns) return history.slice(starts[0] ?? history.length)
  return history.slice(starts[starts.length - turns])
}

// Mark the end of the request for prompt caching so the next request (the
// next tool iteration or the next turn) reads the shared history from cache.
// Applied to a copy so breakpoints never accumulate in stored history.
function withCacheBreakpoint(msgs) {
  if (!msgs.length) return msgs
  const last = msgs[msgs.length - 1]
  const blocks = typeof last.content === 'string'
    ? [{ type: 'text', text: last.content }]
    : last.content.map((b) => ({ ...b }))
  blocks[blocks.length - 1].cache_control = { type: 'ephemeral' }
  return [...msgs.slice(0, -1), { ...last, content: blocks }]
}

const todayLocal = () => new Date().toLocaleDateString('en-CA')

// The chat conversation is persisted to localStorage so an iOS home-screen
// launch that cold-reloads the page (iOS evicts backgrounded web views from
// memory) can resume the conversation instead of starting over.
const CHAT_STORAGE_KEY = 'fitness-chat-session'

function loadChatSnapshot() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function useChat() {
  const [restored] = useState(loadChatSnapshot) // one-time read of persisted session
  const [messages, setMessages] = useState(() => restored?.messages ?? []) // display format: { role, content: string }
  const [apiMessages, setApiMessages] = useState(() => restored?.apiMessages ?? []) // Anthropic API format
  const [isLoading, setIsLoading] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState(null)
  const [systemPrompt, setSystemPrompt] = useState(null)

  // Persist the conversation whenever it changes (and clear storage once the
  // conversation is emptied, e.g. via clearChat) so a reload resumes cleanly.
  useEffect(() => {
    try {
      if (!messages.length && !apiMessages.length) {
        localStorage.removeItem(CHAT_STORAGE_KEY)
      } else {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ messages, apiMessages }))
      }
    } catch {
      // storage full/unavailable — non-fatal, chat still works in-memory
    }
  }, [messages, apiMessages])

  const buildSystemPrompt = useCallback(() => {
    const today = todayLocal()
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    return `You are a personal fitness assistant with read and write access to the user's fitness data. Today's date is ${today} (${timezone}).

You can help the user:
- Log new workouts and exercises
- Review workout history and progress
- Track nutrition
- Answer questions about their fitness data

CRITICAL: Never tell the user you have logged, saved, updated, or deleted anything unless a tool call has already succeeded and returned a success response. Do not describe taking an action as a substitute for actually taking it. If you have not made the tool call yet, make it — do not narrate it.

Exercises have four types — always respect the type when logging and comparing:
- weighted: sets/reps/weight. Higher weight = better PR.
- bodyweight: sets/reps (no weight — e.g. pull-ups, push-ups, dips). Higher reps = better PR. Do not log weight.
- timed: sets/seconds (stored in the reps field — e.g. planks). More seconds = better PR. Do not log weight.
- assisted: sets/reps/weight (machine-assisted). Lower weight = less assistance = better PR.

When logging workouts, call log_workout as soon as the user provides an exercise — do not wait for the full workout. Each log_workout call must contain only the exercise(s) from the user's current message — never include exercises from earlier in the conversation. Always include the sets field — default to 1 if not stated. When the user says "same again", "another set", or similar, log a new entry with the same exercise_name, sets, reps, and weight as the most recently logged entry. If an exercise doesn't exist, create it with add_exercise first, then proceed. Only ask for the muscle group if context gives no clue.

Set notation — the user logs sets in shorthand. Parse it exactly like this:
- "R@W" with no "x" is ONE set of R reps at W lbs. "2@225" → sets 1, reps 2, weight 225. Never treat the number before "@" as sets.
- "SxR@W" is S sets of R reps at W lbs. "3x7@135" → sets 3, reps 7, weight 135.
- The number after "@" is always the weight in lbs, never reps.
- Comma-separated items are separate entries: "Bench 2@225, 10@205, 12@185" → three entries, each sets 1.

Tables — the chat panel is narrow, so keep every table to four columns or fewer:
- Group by exercise. Put each exercise's name in a "### " heading, then a table under it with columns Sets | Reps | Weight | Volume. Never add an Exercise column.
- One row per logged entry, in the order logged. Never combine entries on one row (no "10/8/6" reps or "188/168/168" weights).
- Volume = sets × reps × weight. For bodyweight and timed exercises, show "—" for Weight and Volume.
- When there are totals, add them as a line of text after the table rather than as an extra row or column.

When updating a workout entry to use a different exercise that doesn't exist yet, create it with add_exercise first, then retry the update.

When the user indicates they are starting a workout by naming a routine (e.g. "Push day", "leg day", "pull"), do all of the following in a single response:
1. Call log_workout for today's date with the appropriate routine value (Core, Legs, Push, Pull, or Shoulders) and no entries yet.
2. Call get_recent_workouts with that routine filter (limit 2) to fetch the last session for that routine.
3. Reply with a confirmation that today's workout has been created, then the exercises from the previous session, formatted as described under "Tables".

When the user mentions an exercise name during a workout session:
- Establish the last time they did THIS exercise on any previous date — not necessarily the most recent session. An exercise is often trained only every few sessions, so it is frequently absent from the most recent workout.
  - If that exercise already appears in previous-session data you fetched this session, use that data — do not fetch again.
  - Otherwise call get_last_exercise_session for it. NEVER report "N/A" or "no previous data" for an exercise just because it was missing from the most recent session — call get_last_exercise_session first, and only treat it as having no history if it returns last_session: null.
- Call get_exercise_pr for the exercise if you don't already know the PR from earlier in this session.
- CRITICAL: Never call log_workout in the same response as get_last_exercise_session, get_recent_workouts, or get_exercise_pr. Always fetch data first, then call log_workout in the next response after you have the results.
- Before logging the entry, show that last session for this exercise, formatted as described under "Tables". Use only workouts from a previous date — never count today's existing entries as "last session."
- After calling log_workout, append a running volume comparison: "Last session: Xlbs — This session so far: Ylbs". For "this session so far," use session_totals from that log_workout result (volume_lbs, sets_logged) — it is read from the database after the insert and already includes the set you just logged. Do not compute it yourself from earlier messages, memory, or get_recent_workouts data.
- If the logged weight exceeds the all-time PR, congratulate the user on the new record.
- Volume for a single entry = sets × reps × weight.
- Earlier messages may have been trimmed from this conversation. If you are missing context (which workout, which exercise a set belongs to, what has been logged), look it up with get_recent_workouts for today's date instead of asking the user or claiming nothing was logged. A set given without an exercise name ("10@25", "6 more") belongs to the exercise most recently logged today.
- If the user disputes what's been logged (questions a count, says "that's wrong", etc.), call get_recent_workouts with today's date to get the ground truth before responding. Present that data verbatim — do not infer or adjust.

Be concise. Confirm only after tool calls succeed.`
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

    setMessages((prev) => [...prev, { role: 'user', content: text.trim() }])
    setIsLoading(true)
    setError(null)

    // Sliding window over persisted history keeps the request bounded.
    const trimmedHistory = trimToTurns(apiMessages, MAX_HISTORY_TURNS - 1)
    let currentApiMessages = [...trimmedHistory, { role: 'user', content: text.trim() }]
    let assistantText = null
    let iterations = 0

    try {
      while (true) {
        if (iterations++ >= MAX_TOOL_ITERATIONS) {
          throw new Error(`Reached maximum tool iterations (${MAX_TOOL_ITERATIONS}). The assistant may be stuck in a loop — try rephrasing.`)
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

        const systemBlocks = [
          { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
        ]

        const res = await fetch(`${supabaseUrl}/functions/v1/claude-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            system: systemBlocks,
            messages: withCacheBreakpoint(currentApiMessages),
            tools: TOOL_DEFINITIONS,
            temperature: 0.2,
          }),
        })

        if (!res.ok) {
          const errText = await res.text()
          throw new Error(`Function error ${res.status}: ${errText}`)
        }

        const data = await res.json()

        if (data.anthropic_status && data.anthropic_status !== 200) {
          throw new Error(`Anthropic error ${data.anthropic_status}: ${data.error?.message ?? JSON.stringify(data)}`)
        }

        const response = data

        if (response.stop_reason === 'tool_use') {
          setIsWorking(true)

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

          const cleanToolResults = toolResults.map((tr) => ({
            type: tr.type,
            tool_use_id: tr.tool_use_id,
            content: tr.content,
          }))

          currentApiMessages = [
            ...currentApiMessages,
            { role: 'user', content: cleanToolResults },
          ]

          setIsWorking(false)
        } else if (response.stop_reason === 'end_turn') {
          assistantText = (response.content ?? [])
            .filter((b) => b.type === 'text')
            .map((b) => b.text)
            .join('\n\n')
            .trim()
          break
        } else {
          // max_tokens, pause_turn, refusal, or anything else — treat as failure so
          // apiMessages isn't left in an inconsistent state (dangling user message
          // with no assistant reply).
          throw new Error(`Assistant stopped unexpectedly (${response.stop_reason ?? 'unknown reason'}). Try again.`)
        }
      }

      // Success path: commit both display and API history.
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantText }])
      // Store the full turn, tool calls and results included.
      setApiMessages(trimToTurns([
        ...currentApiMessages,
        { role: 'assistant', content: assistantText || '(no reply)' },
      ], MAX_HISTORY_TURNS))
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      // Do NOT touch apiMessages — the previous turn's state is still valid.
    } finally {
      setIsLoading(false)
      setIsWorking(false)
    }
  }, [apiMessages, isLoading, systemPrompt])

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
