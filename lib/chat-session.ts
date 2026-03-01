/**
 * Chat session management — persistence, switching, history.
 */

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  editProposals?: Array<{ filePath: string; content: string }>
}

const LS_PREFIX = 'code-editor:chat:'

export function loadMessages(chatId: string): ChatMessage[] {
  try {
    const saved = localStorage.getItem(LS_PREFIX + chatId)
    return saved ? JSON.parse(saved) : []
  } catch { return [] }
}

export function saveMessages(chatId: string, messages: ChatMessage[]) {
  try {
    localStorage.setItem(LS_PREFIX + chatId, JSON.stringify(messages.slice(-50)))
  } catch {}
}

export function generateChatId(): string {
  return crypto.randomUUID()
}

export function emitSessionUpdate(chatId: string, title: string, preview: string, mode?: string) {
  window.dispatchEvent(new CustomEvent('chat-session-update', {
    detail: { id: chatId, title, preview, timestamp: Date.now(), mode }
  }))
}
