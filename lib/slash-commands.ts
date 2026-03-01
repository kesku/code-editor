/**
 * Slash command definitions and interception.
 */

import type { ChatMessage } from '@/lib/chat-session'
import { diffEngine } from '@/lib/streaming-diff'

export interface SlashCommandDef {
  cmd: string
  desc: string
  icon: string
}

export const SLASH_COMMANDS: SlashCommandDef[] = [
  { cmd: '/edit', desc: 'Edit current file', icon: 'lucide:pencil' },
  { cmd: '/explain', desc: 'Explain code', icon: 'lucide:book-open' },
  { cmd: '/refactor', desc: 'Refactor code', icon: 'lucide:refresh-cw' },
  { cmd: '/generate', desc: 'Generate new code', icon: 'lucide:plus' },
  { cmd: '/search', desc: 'Search across repo', icon: 'lucide:search' },
  { cmd: '/commit', desc: 'Commit changes', icon: 'lucide:git-commit-horizontal' },
  { cmd: '/diff', desc: 'Show changes', icon: 'lucide:git-compare' },
  { cmd: '/changes', desc: 'Pre-commit review', icon: 'lucide:eye' },
]

export function filterSuggestions(input: string): SlashCommandDef[] {
  if (!input.startsWith('/')) return []
  const term = input.toLowerCase()
  return SLASH_COMMANDS.filter(c => c.cmd.startsWith(term))
}

export type SlashResult = { handled: true; messages: ChatMessage[] } | { handled: false }

/**
 * Try to intercept a slash command. Returns messages to append if handled.
 */
export function interceptSlashCommand(
  text: string,
  dirtyFiles: Array<{ path: string }>,
): SlashResult {
  if (text.startsWith('/commit')) {
    const commitMsg = text.replace(/^\/commit\s*/, '').trim()
    if (!commitMsg) {
      return {
        handled: true,
        messages: [{ id: crypto.randomUUID(), role: 'system', content: 'Usage: /commit <message>', timestamp: Date.now() }],
      }
    }
    window.dispatchEvent(new CustomEvent('agent-commit', { detail: { message: commitMsg } }))
    return {
      handled: true,
      messages: [
        { id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() },
        { id: crypto.randomUUID(), role: 'system', content: 'Committing...', timestamp: Date.now() },
      ],
    }
  }

  if (text === '/changes') {
    window.dispatchEvent(new CustomEvent('open-changes-panel'))
    return {
      handled: true,
      messages: [
        { id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() },
        { id: crypto.randomUUID(), role: 'system', content: 'Opening pre-commit review...', timestamp: Date.now() },
      ],
    }
  }

  if (text === '/diff') {
    const changes = diffEngine.getChanges()
    let content: string
    if (changes.length > 0) {
      const summary = diffEngine.getSummary()
      content = `${summary.fileCount} file(s) changed: +${summary.additions} -${summary.deletions}\nFiles: ${changes.map(c => c.path).join(', ')}`
    } else if (dirtyFiles.length > 0) {
      content = `${dirtyFiles.length} unsaved file(s): ${dirtyFiles.map(f => f.path).join(', ')}`
    } else {
      content = 'No changes detected.'
    }
    return {
      handled: true,
      messages: [
        { id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() },
        { id: crypto.randomUUID(), role: 'system', content, timestamp: Date.now() },
      ],
    }
  }

  return { handled: false }
}
