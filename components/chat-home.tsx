'use client'

import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react'
import { Icon } from '@iconify/react'
import { KnotLogo } from '@/components/knot-logo'
import { KnotBackground } from '@/components/knot-background'
import { ModeSelector } from '@/components/mode-selector'
import type { AgentMode } from '@/components/mode-selector'
import { PermissionsToggle } from '@/components/permissions-toggle'
import { useRepo } from '@/context/repo-context'
import { useLocal } from '@/context/local-context'
import { useGateway } from '@/context/gateway-context'
import { emit } from '@/lib/events'

const STARTER_PROMPTS = [
  { icon: 'lucide:book-open-text', label: 'Explain this codebase' },
  { icon: 'lucide:bug', label: 'Find and fix bugs' },
  { icon: 'lucide:test-tubes', label: 'Write tests for the open file' },
  { icon: 'lucide:sparkles', label: 'Refactor for readability' },
  { icon: 'lucide:circle-help', label: 'What does this function do?' },
] as const

interface Props {
  onSend: (text: string, mode: AgentMode) => void
  onSelectFolder: () => void
  onCloneRepo: () => void
  onImageAttach?: () => void
  imageAttachments?: Array<{ name: string; dataUrl: string }>
  onRemoveImage?: (index: number) => void
}

export const ChatHome = memo(function ChatHome({
  onSend,
  onSelectFolder,
  onCloneRepo,
  onImageAttach,
  imageAttachments = [],
  onRemoveImage,
}: Props) {
  const [input, setInput] = useState('')
  const [agentMode, setAgentMode] = useState<AgentMode>('ask')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { repo } = useRepo()
  const local = useLocal()
  const { status } = useGateway()

  const repoShort = useMemo(
    () => repo?.fullName?.split('/').pop() ?? local.rootPath?.split('/').pop() ?? null,
    [repo?.fullName, local.rootPath],
  )
  const hasWorkspace = !!repoShort
  const branchName = local.gitInfo?.branch ?? null

  const [isComposing, setIsComposing] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = '0'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [input])

  const startOrSend = useCallback(() => {
    const t = input.trim()
    onSend(t || '', agentMode)
    setInput('')
  }, [input, agentMode, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (isComposing) return
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        startOrSend()
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        startOrSend()
      }
      if (e.key === 'Tab' && !input.trim()) {
        e.preventDefault()
        setAgentMode((m) => (m === 'ask' ? 'agent' : 'ask'))
      }
    },
    [startOrSend, input, isComposing],
  )

  return (
    <div className="flex-1 overflow-y-auto relative">
      <KnotBackground />
      <div className="min-h-full w-full max-w-[720px] mx-auto flex flex-col justify-center px-4 sm:px-6 py-8 sm:py-10 md:py-12 relative z-[1]">
        {/* Header — "Let's build" */}
        <div className="flex flex-col items-center mb-6 sm:mb-7">
          <div
            className={`mb-3 ${
              status === 'connected' ? 'logo-breathe-connected' : 'logo-breathe-idle'
            }`}
          >
            <KnotLogo size={40} color="var(--brand)" />
          </div>

          <h1 className="text-center text-[32px] font-semibold tracking-[-0.04em] leading-none text-[var(--text-primary)]">
            Let&apos;s build
          </h1>

          <p className="mt-2 text-center text-[12px] text-[var(--text-tertiary)]">
            Start with a prompt or ask your own question.
          </p>

          {/* Workspace dropdown */}
          <button
            onClick={onSelectFolder}
            className="codex-workspace-dropdown mt-2.5 inline-flex items-center gap-1.5 text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            {repoShort ?? 'Select workspace'}
            <Icon icon="lucide:chevron-down" width={14} height={14} className="opacity-50" />
          </button>
        </div>

        {/* Starter prompts */}
        <div className="mb-4 sm:mb-5">
          <div className="flex flex-wrap gap-2">
            {STARTER_PROMPTS.map((starter) => (
              <button
                key={starter.label}
                onClick={() => onSend(starter.label, agentMode)}
                className="group inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-elevated)_72%,transparent)] px-3 py-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-disabled)] transition-all cursor-pointer"
              >
                <Icon
                  icon={starter.icon}
                  width={13}
                  height={13}
                  className="text-[var(--text-disabled)] group-hover:text-[var(--text-secondary)] transition-colors"
                />
                {starter.label}
              </button>
            ))}
          </div>
        </div>

        {/* "Explore more" link */}
        <div className="flex justify-end mb-2">
          <button
            onClick={() => emit('open-folder')}
            className="text-[12px] text-[var(--text-disabled)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
          >
            Explore more
          </button>
        </div>

        {/* Composer */}
        <div
          onClick={() => inputRef.current?.focus()}
          className={`codex-composer rounded-xl border backdrop-blur-sm overflow-hidden transition-all duration-200 ${
            isFocused
              ? input.trim()
                ? 'border-[color-mix(in_srgb,var(--brand)_50%,var(--border))]'
                : 'border-[color-mix(in_srgb,var(--brand)_25%,var(--border))]'
              : 'border-[var(--border)] hover:border-[color-mix(in_srgb,var(--text-disabled)_60%,var(--border))]'
          }`}
          style={{ background: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)' }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder={
              repoShort
                ? `Ask KnotCode anything, @ to add files, / for commands`
                : 'Describe what you want to build…'
            }
            aria-label="Chat input"
            className="w-full bg-transparent px-4 pt-3.5 pb-2 text-[14px] leading-[1.6] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] outline-none resize-none min-h-[48px] max-h-[200px] overflow-y-auto"
          />

          {/* Image previews */}
          {imageAttachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3 pb-1">
              {imageAttachments.map((img, i) => (
                <div
                  key={i}
                  className="relative group/img rounded-md border border-[var(--border)] bg-[var(--bg-subtle)] overflow-hidden"
                  style={{ width: 72, height: 48 }}
                >
                  <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                  {onRemoveImage && (
                    <button
                      onClick={() => onRemoveImage(i)}
                      className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/50 text-white/80 hover:bg-red-500/80 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all cursor-pointer"
                    >
                      <Icon icon="lucide:x" width={7} height={7} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Bottom toolbar — Codex-style pill bar */}
          <div className="px-3 pb-2.5 pt-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {/* + button */}
                <button
                  onClick={onImageAttach}
                  className="codex-pill-btn flex items-center justify-center w-7 h-7 rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--text-primary)_4%,transparent)] text-[var(--text-disabled)] hover:text-[var(--text-secondary)] hover:border-[var(--text-disabled)] transition-all cursor-pointer"
                  title="Attach file"
                >
                  <Icon icon="lucide:plus" width={14} height={14} />
                </button>

                {/* Mode selector */}
                <ModeSelector mode={agentMode} onChange={setAgentMode} size="sm" />

                {/* Divider */}
                <div className="w-px h-4 bg-[var(--border)]" />

                {/* Gateway status */}
                <span
                  className={`codex-pill inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border cursor-default ${
                    status === 'connected'
                      ? 'text-[var(--text-secondary)] border-[var(--border)] bg-[color-mix(in_srgb,var(--text-primary)_4%,transparent)]'
                      : 'text-[var(--text-disabled)] border-[var(--border)] bg-[color-mix(in_srgb,var(--text-primary)_3%,transparent)]'
                  }`}
                >
                  <Icon icon="lucide:monitor" width={12} height={12} />
                  {status === 'connected' ? 'Local' : 'Offline'}
                </span>

                {/* Permissions */}
                <PermissionsToggle size="sm" />

                {/* Branch pill */}
                {branchName && (
                  <span className="codex-pill inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-[var(--text-secondary)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--text-primary)_4%,transparent)] cursor-default">
                    <Icon icon="lucide:git-branch" width={12} height={12} />
                    {branchName}
                  </span>
                )}
              </div>

              {/* Send */}
              <button
                onClick={startOrSend}
                aria-label={input.trim() ? 'Send message' : 'Start chat'}
                className={`codex-send-btn flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer active:scale-95 ${
                  input.trim()
                    ? 'bg-[var(--brand)] text-[var(--brand-contrast,#fff)] shadow-[0_0_12px_color-mix(in_srgb,var(--brand)_20%,transparent)]'
                    : 'bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_12%,transparent)]'
                }`}
              >
                <Icon
                  icon={input.trim() ? 'lucide:arrow-up' : 'lucide:arrow-right'}
                  width={14}
                  height={14}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Workspace setup (no workspace) */}
        {!hasWorkspace && (
          <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
            <div className="h-px bg-[var(--border)]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={onSelectFolder}
                className="group flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-elevated)_60%,transparent)] text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-md bg-[color-mix(in_srgb,var(--text-primary)_5%,transparent)] border border-[var(--border)] flex items-center justify-center shrink-0">
                  <Icon
                    icon="lucide:folder-open"
                    width={14}
                    height={14}
                    className="text-[var(--text-tertiary)]"
                  />
                </div>
                <span className="min-w-0">
                  <span className="block text-[12px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                    Open Folder
                  </span>
                  <span className="block text-[10px] text-[var(--text-disabled)] font-mono">
                    local project
                  </span>
                </span>
              </button>
              <button
                onClick={onCloneRepo}
                className="group flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-elevated)_60%,transparent)] text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-md bg-[color-mix(in_srgb,var(--text-primary)_5%,transparent)] border border-[var(--border)] flex items-center justify-center shrink-0">
                  <Icon
                    icon="lucide:git-branch"
                    width={14}
                    height={14}
                    className="text-[var(--text-tertiary)]"
                  />
                </div>
                <span className="min-w-0">
                  <span className="block text-[12px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                    Clone Repository
                  </span>
                  <span className="block text-[10px] text-[var(--text-disabled)] font-mono">
                    from GitHub
                  </span>
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 sm:mt-8 flex justify-center">
          <span className="text-[10px] font-mono tracking-[0.08em] text-[var(--text-disabled)] opacity-40 uppercase">
            KnotCode
          </span>
        </div>
      </div>
    </div>
  )
})
