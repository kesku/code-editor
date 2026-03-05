/**
 * Chat stream handler — processes gateway chat events (delta, final, error, aborted, tool_use).
 * Extracted from agent-panel.tsx for testability and separation of concerns.
 */

import { parseEditProposals, type EditProposal } from '@/lib/edit-parser'
import { diffEngine } from '@/lib/streaming-diff'
import { emit } from '@/lib/events'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  type?: 'text' | 'edit' | 'error' | 'tool' | 'status' | 'cancelled'
  content: string
  timestamp: number
  editProposals?: EditProposal[]
}

export interface StreamState {
  sentKeys: Set<string>
  handledKeys: Set<string>
  lastFinal: { content: string; ts: number } | null
  sessionKey: string
  isSending: boolean
}

interface StreamCallbacks {
  setStreamBuffer: React.Dispatch<React.SetStateAction<string>>
  setIsStreaming: (v: boolean) => void
  setSending: (v: boolean) => void
  setThinkingTrail: React.Dispatch<React.SetStateAction<string[]>>
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  getFile: (path: string) => { content: string } | undefined
}

function extractText(message: Record<string, unknown> | undefined): string {
  if (!message) return ''
  const content = message.content as string | Array<Record<string, unknown>> | undefined
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((b) => b.type === 'text' || b.type === 'output_text')
      .map((b) => (b.text as string) || '')
      .join('')
  }
  return ''
}

export function handleChatEvent(
  payload: unknown,
  state: StreamState,
  callbacks: StreamCallbacks,
): void {
  const p = payload as Record<string, unknown>
  const eventState = p.state as string | undefined
  const idempotencyKey = p.idempotencyKey as string | undefined
  const eventSessionKey = p.sessionKey as string | undefined

  // Ignore inline-completion traffic
  if (idempotencyKey?.startsWith('completion-')) return

  // Match by idempotency key or session key fallback
  const matchesIdem = !!(idempotencyKey && state.sentKeys.has(idempotencyKey))
  const matchesSession = !idempotencyKey && eventSessionKey === state.sessionKey && state.isSending
  if (!matchesIdem && !matchesSession) return

  // Tool use events → thinking trail
  if (eventState === 'tool_use' || eventState === 'tool_start') {
    const toolName = (p.toolName as string) || (p.name as string) || ''
    const toolInput = p.input as Record<string, unknown> | undefined
    if (toolName) {
      let step = toolName
      if (toolName === 'read' || toolName === 'Read') {
        const path = (toolInput?.path || toolInput?.file_path || '') as string
        step = `Reading ${path.split('/').pop() || path}`
      } else if (toolName.includes('search') || toolName === 'Grep') {
        step = `Searching ${(toolInput?.query as string)?.slice(0, 30) || 'files'}`
      } else if (
        toolName === 'write' ||
        toolName === 'Write' ||
        toolName === 'edit' ||
        toolName === 'Edit'
      ) {
        const path = (toolInput?.path || toolInput?.file_path || '') as string
        step = `Editing ${path.split('/').pop() || path}`
      } else if (toolName.includes('exec') || toolName === 'Bash') {
        step = 'Running command'
      }
      callbacks.setThinkingTrail((prev) => [...prev.slice(-5), step])
      callbacks.setIsStreaming(true)
    }
    return
  }

  if (eventState === 'delta') {
    const message = p.message as Record<string, unknown> | undefined
    const text = extractText(message)
    if (text) {
      callbacks.setStreamBuffer(text)
      callbacks.setIsStreaming(true)
      // Extract thinking trail from streamed content
      const trailPatterns = [
        {
          re: /Reading\s+`([^`]+)`/g,
          fmt: (m: RegExpExecArray) => `Reading ${m[1].split('/').pop()}`,
        },
        {
          re: /searching\s+(?:for\s+)?["']([^"']+)["']/gi,
          fmt: (m: RegExpExecArray) => `Searching "${m[1]}"`,
        },
        {
          re: /(?:Exploring|Looking at|Checking)\s+`?([^`\n]+)`?/gi,
          fmt: (m: RegExpExecArray) => `Exploring ${m[1].split('/').pop()}`,
        },
        {
          re: /(?:Creating|Writing|Editing)\s+`([^`]+)`/g,
          fmt: (m: RegExpExecArray) => `Editing ${m[1].split('/').pop()}`,
        },
      ]
      for (const { re, fmt } of trailPatterns) {
        let match
        while ((match = re.exec(text)) !== null) {
          const step = fmt(match)
          callbacks.setThinkingTrail((prev) =>
            prev.includes(step) ? prev : [...prev.slice(-4), step],
          )
        }
      }
    }
  } else if (eventState === 'final') {
    callbacks.setThinkingTrail([])
    const message = p.message as Record<string, unknown> | undefined
    const finalText = extractText(message)

    if (idempotencyKey) {
      state.sentKeys.delete(idempotencyKey)
      if (state.handledKeys.has(idempotencyKey)) return
      state.handledKeys.add(idempotencyKey)
      setTimeout(() => state.handledKeys.delete(idempotencyKey), 10000)
    }

    callbacks.setStreamBuffer((prev) => {
      const text = finalText || prev || ''
      if (text && !/^NO_REPLY$/i.test(text.trim())) {
        // Dedupe: skip if identical content arrived within 8s
        const now = Date.now()
        const last = state.lastFinal
        if (last && last.content === text && now - last.ts < 8000) {
          return ''
        }
        state.lastFinal = { content: text, ts: now }

        const editProposals = parseEditProposals(text)
        if (editProposals.length > 0) {
          for (const proposal of editProposals) {
            const existing = callbacks.getFile(proposal.filePath)
            diffEngine.registerOriginal(proposal.filePath, existing?.content ?? '')
            diffEngine.updateProposed(proposal.filePath, proposal.content)
            diffEngine.finalize(proposal.filePath)
          }
          diffEngine.finalizeAll()
          emit('show-inline-diff', { proposals: editProposals })
        }
        callbacks.setMessages((msgs) => [
          ...msgs,
          {
            id: crypto.randomUUID(),
            role: 'assistant' as const,
            type: editProposals.length > 0 ? ('edit' as const) : ('text' as const),
            content: text,
            timestamp: Date.now(),
            editProposals: editProposals.length > 0 ? editProposals : undefined,
          },
        ])
        emit('agent-reply')
      }
      return ''
    })
    callbacks.setIsStreaming(false)
    callbacks.setSending(false)
  } else if (eventState === 'error') {
    callbacks.setThinkingTrail([])
    const errorMsg = (p.errorMessage as string) || 'Unknown error'
    if (idempotencyKey) state.sentKeys.delete(idempotencyKey)
    callbacks.setStreamBuffer('')
    callbacks.setMessages((msgs) => [
      ...msgs,
      {
        id: crypto.randomUUID(),
        role: 'system' as const,
        type: 'error' as const,
        content: 'Error: ' + errorMsg,
        timestamp: Date.now(),
      },
    ])
    callbacks.setIsStreaming(false)
    callbacks.setSending(false)
  } else if (eventState === 'aborted') {
    callbacks.setThinkingTrail([])
    if (idempotencyKey) state.sentKeys.delete(idempotencyKey)
    callbacks.setStreamBuffer((prev) => {
      if (prev) {
        callbacks.setMessages((msgs) => [
          ...msgs,
          {
            id: crypto.randomUUID(),
            role: 'assistant' as const,
            type: 'cancelled' as const,
            content: prev + ' [cancelled]',
            timestamp: Date.now(),
          },
        ])
      }
      return ''
    })
    callbacks.setIsStreaming(false)
    callbacks.setSending(false)
  }
}
