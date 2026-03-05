'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { MarkdownPreview } from '@/components/markdown-preview'
import { PlanView, type PlanStep } from '@/components/plan-view'
import { navigateToLine } from '@/lib/line-links'
import { copyToClipboard } from '@/lib/clipboard'
import type { ChatMessage } from '@/lib/chat-stream'
import type { EditProposal } from '@/lib/edit-parser'

interface MessageListProps {
  messages: ChatMessage[]
  streamBuffer: string
  isStreaming: boolean
  thinkingTrail: string[]
  agentMode: string
  onShowDiff: (proposal: EditProposal, messageId: string) => void
  onQuickApply: (proposal: EditProposal) => void
  onDeleteMessage: (id: string) => void
  onRegenerate: (id: string) => void
  onEditAndResend: (id: string) => void
  onSendMessage: () => void
}

function parsePlanSteps(text: string): PlanStep[] {
  const steps: PlanStep[] = []
  const matches = text.matchAll(/^(\d+)\.\s+\*{0,2}([^*]+?)\*{0,2}\s*$/gm)
  for (const m of matches) {
    steps.push({
      id: `step-${m[1]}`,
      title: m[2].trim(),
      description: undefined,
      status: 'pending',
    })
  }
  return steps
}

export function MessageList({
  messages,
  streamBuffer,
  isStreaming,
  thinkingTrail,
  agentMode,
  onShowDiff,
  onQuickApply,
  onDeleteMessage,
  onRegenerate,
  onEditAndResend,
  onSendMessage,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamBuffer])

  useEffect(() => {
    if (!menuOpenId) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpenId])

  const handleCopy = useCallback((content: string) => {
    copyToClipboard(content)
    setMenuOpenId(null)
  }, [])

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0 scroll-shadow"
      onScroll={(e) => {
        const el = e.currentTarget
        el.classList.toggle('has-scroll-top', el.scrollTop > 8)
        el.classList.toggle(
          'has-scroll-bottom',
          el.scrollTop + el.clientHeight < el.scrollHeight - 8,
        )
      }}
    >
      {messages.map((msg) => {
        const t = msg.type ?? 'text'
        const isUser = msg.role === 'user'
        const isSystem = msg.role === 'system'
        const isAssistant = msg.role === 'assistant'

        const bubbleClass = isUser
          ? 'bg-[color-mix(in_srgb,var(--brand)_15%,transparent)] text-[var(--text-primary)] rounded-br-sm'
          : t === 'error'
            ? 'px-2.5 py-1.5 text-[10px] border-l-2 border-[var(--color-deletions,#ef4444)] bg-[color-mix(in_srgb,var(--color-deletions,#ef4444)_8%,transparent)] text-[var(--text-secondary)]'
            : t === 'tool'
              ? 'px-2.5 py-1 text-[10px] border-l-2 border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_6%,transparent)] text-[var(--text-secondary)]'
              : t === 'status'
                ? 'px-2.5 py-1 text-[10px] bg-[color-mix(in_srgb,var(--text-disabled)_6%,transparent)] text-[var(--text-tertiary)]'
                : t === 'cancelled'
                  ? 'bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] rounded-bl-sm opacity-60'
                  : isSystem
                    ? 'px-2.5 py-1.5 text-[10px] border-l-2 border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_6%,transparent)] text-[var(--text-secondary)]'
                    : t === 'edit'
                      ? 'bg-[var(--bg-subtle)] border border-[color-mix(in_srgb,var(--color-additions,#22c55e)_25%,var(--border))] text-[var(--text-primary)] rounded-bl-sm'
                      : 'bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] rounded-bl-sm'

        const typeIcon =
          t === 'error'
            ? 'lucide:alert-circle'
            : t === 'tool'
              ? 'lucide:wrench'
              : t === 'status'
                ? 'lucide:info'
                : t === 'cancelled'
                  ? 'lucide:circle-slash'
                  : t === 'edit' && isAssistant
                    ? 'lucide:file-diff'
                    : null

        return (
          <div
            key={msg.id}
            className={`group/msg flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-fade-in-up`}
            style={{ animationDuration: '0.2s' }}
          >
            <div className="relative max-w-[90%] min-w-0">
              {/* Ellipsis menu trigger */}
              <button
                onClick={() => setMenuOpenId((prev) => (prev === msg.id ? null : msg.id))}
                className={`absolute ${isUser ? '-left-5' : '-right-5'} top-0.5 p-0.5 rounded text-[var(--text-disabled)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer ${menuOpenId === msg.id ? 'opacity-100' : 'opacity-0 group-hover/msg:opacity-100'}`}
              >
                <Icon icon="lucide:ellipsis" width={13} height={13} />
              </button>

              {/* Context menu */}
              {menuOpenId === msg.id && (
                <div
                  ref={menuRef}
                  className={`absolute ${isUser ? 'right-0' : 'left-0'} top-6 z-50 w-44 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl py-1 animate-fade-in`}
                  style={{ animationDuration: '0.1s' }}
                >
                  <button
                    onClick={() => handleCopy(msg.content)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                  >
                    <Icon icon="lucide:copy" width={12} height={12} /> Copy message
                  </button>
                  {isAssistant && (
                    <button
                      onClick={() => {
                        setMenuOpenId(null)
                        onRegenerate(msg.id)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                    >
                      <Icon icon="lucide:refresh-cw" width={12} height={12} /> Regenerate
                    </button>
                  )}
                  {isUser && (
                    <button
                      onClick={() => {
                        setMenuOpenId(null)
                        onEditAndResend(msg.id)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                    >
                      <Icon icon="lucide:pencil" width={12} height={12} /> Edit & resend
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpenId(null)
                      onDeleteMessage(msg.id)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[var(--color-deletions,#ef4444)] hover:bg-[color-mix(in_srgb,var(--color-deletions,#ef4444)_6%,transparent)] transition-colors cursor-pointer"
                  >
                    <Icon icon="lucide:trash-2" width={12} height={12} /> Delete
                  </button>
                </div>
              )}

              {/* Message bubble */}
              <div className={`rounded-xl px-3 py-2 text-[12px] leading-relaxed ${bubbleClass}`}>
                {(t === 'tool' || t === 'status' || t === 'error') && typeIcon && (
                  <span className="inline-flex items-center gap-1 mr-1 align-middle">
                    <Icon
                      icon={typeIcon}
                      width={11}
                      height={11}
                      className={
                        t === 'error'
                          ? 'text-[var(--color-deletions,#ef4444)]'
                          : 'text-[var(--text-disabled)]'
                      }
                    />
                  </span>
                )}
                {t === 'cancelled' && (
                  <span className="inline-flex items-center gap-1 mr-1 align-middle text-[var(--text-disabled)]">
                    <Icon icon="lucide:circle-slash" width={11} height={11} />
                  </span>
                )}
                {isUser ? (
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                ) : isSystem && (t === 'tool' || t === 'status' || t === 'error') ? (
                  <span className="inline">{msg.content}</span>
                ) : (
                  <div
                    className="prose-chat"
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      const clickText = target.textContent ?? ''
                      const lineMatch =
                        clickText.match(/(?:lines?\s+|L)(\d+)(?:\s*[-–]\s*L?(\d+))?/i) ||
                        clickText.match(/([\w./\-]+\.\w+)[:#]L?(\d+)/)
                      if (lineMatch) {
                        const start = parseInt(lineMatch[1] ?? '', 10)
                        const end = lineMatch[2] ? parseInt(lineMatch[2], 10) : undefined
                        if (!isNaN(start)) {
                          e.preventDefault()
                          navigateToLine(start, end)
                        }
                      }
                    }}
                  >
                    {t === 'edit' && isAssistant && (
                      <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-[var(--color-additions,#22c55e)] font-medium">
                        <Icon icon="lucide:file-diff" width={12} height={12} />
                        File changes proposed
                      </div>
                    )}
                    <MarkdownPreview content={msg.content} />
                    {isAssistant && parsePlanSteps(msg.content).length >= 3 && (
                      <PlanView
                        steps={parsePlanSteps(msg.content)}
                        interactive={agentMode === 'ask'}
                        onApprove={onSendMessage}
                        onSkip={onSendMessage}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            <span className="text-[8px] text-[var(--text-disabled)] mt-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity font-mono">
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>

            {/* Edit proposal buttons */}
            {msg.editProposals && msg.editProposals.length > 0 && (
              <div className="flex flex-col gap-1 mt-1.5">
                {msg.editProposals.map((proposal, i) => (
                  <div key={i} className="flex items-center gap-1 flex-wrap">
                    <button
                      onClick={() => onQuickApply(proposal)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors cursor-pointer"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--color-additions) 40%, transparent)',
                        backgroundColor:
                          'color-mix(in srgb, var(--color-additions) 12%, transparent)',
                        color: 'var(--color-additions)',
                      }}
                      title="Apply changes to editor"
                    >
                      <Icon icon="lucide:play" width={12} height={12} />
                      Apply to {proposal.filePath.split('/').pop()}
                    </button>
                    <button
                      onClick={() => onShowDiff(proposal, msg.id)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                      title="Review changes in diff viewer first"
                    >
                      <Icon icon="lucide:git-compare" width={12} height={12} />
                      Diff
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Streaming indicator */}
      {isStreaming && (
        <div
          className="flex flex-col items-start animate-fade-in"
          style={{ animationDuration: '0.15s' }}
        >
          {streamBuffer ? (
            <div className="max-w-[90%] min-w-0 rounded-xl px-3 py-2 text-[12px] leading-relaxed bg-[var(--bg-subtle)] border border-[color-mix(in_srgb,var(--brand)_20%,var(--border))] text-[var(--text-primary)] rounded-bl-sm">
              <div className="prose-chat">
                <MarkdownPreview content={streamBuffer} />
              </div>
              <span className="inline-block w-1.5 h-3.5 bg-[var(--brand)] animate-pulse ml-0.5 align-text-bottom rounded-sm" />
            </div>
          ) : (
            <div className="flex flex-col gap-1 px-3 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] rounded-bl-sm max-w-[90%]">
              {thinkingTrail.length > 0 && (
                <div className="relative flex flex-col gap-0 mb-1.5 ml-1">
                  <div className="absolute left-[4px] top-1 bottom-1 w-px bg-[color-mix(in_srgb,var(--brand)_20%,transparent)]" />
                  {thinkingTrail.map((step, i) => {
                    const isLast = i === thinkingTrail.length - 1
                    const age = thinkingTrail.length - 1 - i
                    const icon = step.startsWith('Reading')
                      ? 'lucide:file-text'
                      : step.startsWith('Searching')
                        ? 'lucide:search'
                        : step.startsWith('Exploring')
                          ? 'lucide:folder-open'
                          : step.startsWith('Editing') || step.startsWith('Writing')
                            ? 'lucide:pencil'
                            : step.startsWith('Running') || step.startsWith('Executing')
                              ? 'lucide:terminal'
                              : step.startsWith('Creating')
                                ? 'lucide:plus'
                                : step.startsWith('Analyzing')
                                  ? 'lucide:scan'
                                  : 'lucide:sparkles'
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-[10px] py-0.5 plan-step-enter"
                        style={{
                          opacity: isLast ? 1 : Math.max(0.3, 1 - age * 0.2),
                          transform: isLast
                            ? 'scale(1)'
                            : `scale(${Math.max(0.96, 1 - age * 0.01)})`,
                          filter: age > 2 ? `blur(${Math.min(0.4, (age - 2) * 0.2)}px)` : 'none',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        <div className="relative z-[1] shrink-0">
                          {isLast ? (
                            <span className="relative flex h-[9px] w-[9px]">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand)] opacity-50" />
                              <span className="relative inline-flex rounded-full h-[9px] w-[9px] bg-[var(--brand)]" />
                            </span>
                          ) : (
                            <span className="block w-[9px] h-[9px] rounded-full border-2 border-[color-mix(in_srgb,var(--brand)_30%,var(--border))] bg-[var(--bg-subtle)]" />
                          )}
                        </div>
                        <Icon
                          icon={icon}
                          width={10}
                          height={10}
                          className={`shrink-0 ${isLast ? 'text-[var(--brand)]' : 'text-[var(--text-disabled)]'}`}
                        />
                        <span
                          className={`truncate flex-1 ${isLast ? 'text-[var(--text-secondary)] font-medium' : 'text-[var(--text-disabled)]'}`}
                        >
                          {step}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="typing-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  {thinkingTrail.length > 0
                    ? thinkingTrail[thinkingTrail.length - 1]
                    : 'Thinking...'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
