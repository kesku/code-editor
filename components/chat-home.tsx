'use client'

import { useState, useRef, useEffect } from 'react'
import { Icon } from '@iconify/react'
import type { AgentMode } from '@/components/mode-selector'
import { useRepo } from '@/context/repo-context'
import { useLocal } from '@/context/local-context'
import { useGateway } from '@/context/gateway-context'

const ACTIONS = [
  { icon: 'lucide:list-checks', label: 'Plan', prefix: 'Plan how to ' },
  { icon: 'lucide:code-2', label: 'Code', prefix: '' },
  { icon: 'lucide:search-code', label: 'Review', prefix: 'Review ' },
  { icon: 'lucide:bug', label: 'Debug', prefix: 'Find and fix bugs in ' },
  { icon: 'lucide:sparkles', label: 'Refactor', prefix: 'Refactor ' },
  { icon: 'lucide:book-open', label: 'Explain', prefix: 'Explain ' },
  { icon: 'lucide:git-pull-request', label: 'PR Review', prefix: 'Review the latest PR on ' },
]

interface Props {
  onSend: (text: string, mode: AgentMode) => void
  onSelectFolder: () => void
  onCloneRepo: () => void
}

export function ChatHome({ onSend, onSelectFolder, onCloneRepo }: Props) {
  const [input, setInput] = useState('')
  const [modelName, setModelName] = useState('Opus 4.6')
  const [showModelMenu, setShowModelMenu] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { repo } = useRepo()
  const local = useLocal()
  const { sendRequest, status } = useGateway()
  const isConnected = status === 'connected'

  const repoName = repo?.fullName ?? local.rootPath?.split('/').slice(-2).join('/') ?? null

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isConnected) return
    sendRequest('sessions.status', {}).then((resp: any) => {
      if (resp?.model) {
        const short = (resp.model as string).split('/').pop()?.replace(/-/g, ' ') ?? resp.model
        setModelName(short.length > 20 ? short.slice(0, 18) + '…' : short)
      }
    }).catch(() => {})
  }, [isConnected, sendRequest])

  const handleSubmit = () => {
    const text = input.trim()
    if (!text) return
    onSend(text, 'agent')
    setInput('')
  }

  const handleAction = (action: typeof ACTIONS[0]) => {
    if (action.prefix) {
      setInput(action.prefix)
      inputRef.current?.focus()
    } else {
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg)] px-6">
      <div className="w-full max-w-[620px]">
        {/* Heading */}
        <h1 className="text-center text-[22px] font-semibold text-[var(--text-primary)] tracking-tight mb-6">
          {repoName ? (
            <>What&apos;s on your mind?</>
          ) : (
            <>What do you want to build?</>
          )}
        </h1>

        {/* Input card — Zola style */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden mb-5 focus-within:border-[color-mix(in_srgb,var(--brand)_30%,var(--border))] focus-within:ring-[3px] focus-within:ring-[color-mix(in_srgb,var(--brand)_6%,transparent)] transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
            }}
            placeholder={repoName ? `Ask about ${repoName.split('/').pop()}…` : 'Ask Knot Code…'}
            rows={1}
            className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] outline-none border-none"
          />

          {/* Bottom controls — inside the card */}
          <div className="flex items-center justify-between px-3 pb-2.5">
            <div className="flex items-center gap-0.5">
              {/* Attach */}
              <button className="p-1.5 rounded-lg text-[var(--text-disabled)] hover:text-[var(--text-tertiary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer" title="Attach file">
                <Icon icon="lucide:paperclip" width={15} height={15} />
              </button>

              {/* Model selector */}
              <div className="relative">
                <button
                  onClick={() => setShowModelMenu(v => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                >
                  <Icon icon="lucide:sparkles" width={12} height={12} className="text-[var(--brand)]" />
                  {modelName}
                  <Icon icon="lucide:chevron-down" width={9} height={9} className="text-[var(--text-disabled)]" />
                </button>
                {showModelMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowModelMenu(false)} />
                    <div className="absolute bottom-full left-0 mb-1.5 w-48 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                      {['Opus 4.6', 'Sonnet 4.5', 'Haiku 3.5'].map(m => (
                        <button key={m} onClick={() => { setModelName(m); setShowModelMenu(false) }} className={`w-full text-left px-3.5 py-2 text-[11px] hover:bg-[var(--bg-subtle)] cursor-pointer flex items-center gap-2 ${modelName === m ? 'text-[var(--brand)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                          <Icon icon="lucide:sparkles" width={10} height={10} />{m}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Send */}
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                input.trim()
                  ? 'bg-[var(--text-primary)] text-[var(--bg)] hover:opacity-80'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-disabled)] cursor-not-allowed'
              }`}
            >
              <Icon icon="lucide:arrow-up" width={15} height={15} />
            </button>
          </div>
        </div>

        {/* Action pills — Zola style */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {ACTIONS.map(a => (
            <button
              key={a.label}
              onClick={() => handleAction(a)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-disabled)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
            >
              <Icon icon={a.icon} width={13} height={13} className="text-[var(--text-tertiary)]" />
              {a.label}
            </button>
          ))}
        </div>

        {/* Repo context — subtle, below pills */}
        {repoName && (
          <div className="flex items-center justify-center gap-2 mt-6 text-[10px] text-[var(--text-disabled)]">
            <button onClick={onSelectFolder} className="flex items-center gap-1 hover:text-[var(--text-tertiary)] transition-colors cursor-pointer">
              <Icon icon="lucide:folder-git-2" width={10} height={10} />
              {repoName}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
