'use client'

import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { isTauri, tauriInvoke } from '@/lib/tauri'

interface EngineStatus {
  installed: boolean
  running: boolean
  pid: number | null
  version: string | null
  raw: string
}

export function EnginePanel() {
  const [status, setStatus] = useState<EngineStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)

  // Detect Tauri on mount (client-side only)
  useEffect(() => { setIsDesktop(isTauri()) }, [])

  const fetchStatus = useCallback(async () => {
    const result = await tauriInvoke<EngineStatus>('engine_status')
    if (result) setStatus(result)
  }, [])

  // Poll status every 10s
  useEffect(() => {
    if (!isDesktop) return
    fetchStatus()
    const iv = setInterval(fetchStatus, 10000)
    return () => clearInterval(iv)
  }, [isDesktop, fetchStatus])

  const doAction = useCallback(async (action: 'engine_start' | 'engine_stop' | 'engine_restart') => {
    setLoading(true)
    setActionMsg(null)
    try {
      const result = await tauriInvoke<string>(action)
      setActionMsg(result || 'Done')
      // Refresh status after action
      setTimeout(fetchStatus, 1500)
    } catch (err: any) {
      setActionMsg(`Error: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [fetchStatus])

  if (!isDesktop) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] p-6">
        <Icon icon="lucide:server" width={40} height={40} className="opacity-30 mb-4" />
        <p className="text-sm text-center">Gateway Engine management available in the desktop app</p>
      </div>
    )
  }

  const running = status?.running ?? false
  const installed = status?.installed ?? false

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 mb-1">
          <Icon icon="lucide:cpu" width={18} height={18} className="text-[var(--brand)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">OpenClaw Gateway Engine</h2>
        </div>
        <p className="text-[11px] text-[var(--text-tertiary)]">
          Local gateway powering the AI experience
        </p>
      </div>

      {/* Status Card */}
      <div className="p-4 space-y-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4 space-y-3">
          {/* Status indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  running
                    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                    : installed
                      ? 'bg-red-400'
                      : 'bg-neutral-500'
                }`}
              />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {!installed ? 'Not Installed' : running ? 'Running' : 'Stopped'}
              </span>
            </div>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
              title="Refresh status"
            >
              <Icon icon="lucide:refresh-cw" width={14} height={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Details */}
          {status && installed && (
            <div className="space-y-1.5 text-[12px]">
              {status.version && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-tertiary)]">Version</span>
                  <span className="text-[var(--text-secondary)] font-mono">{status.version}</span>
                </div>
              )}
              {status.pid && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-tertiary)]">PID</span>
                  <span className="text-[var(--text-secondary)] font-mono">{status.pid}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {installed && (
          <div className="flex gap-2">
            {!running ? (
              <button
                onClick={() => doAction('engine_start')}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
              >
                <Icon icon="lucide:play" width={14} height={14} />
                Start
              </button>
            ) : (
              <>
                <button
                  onClick={() => doAction('engine_restart')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium bg-[var(--bg-tertiary)] hover:bg-[var(--border)] text-[var(--text-primary)] transition-colors disabled:opacity-50"
                >
                  <Icon icon="lucide:refresh-cw" width={13} height={13} />
                  Restart
                </button>
                <button
                  onClick={() => doAction('engine_stop')}
                  disabled={loading}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors disabled:opacity-50"
                >
                  <Icon icon="lucide:square" width={12} height={12} />
                  Stop
                </button>
              </>
            )}
          </div>
        )}

        {/* Action message */}
        {actionMsg && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-[11px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap">
            {actionMsg}
          </div>
        )}

        {/* Not installed state */}
        {!installed && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 space-y-2">
            <p className="text-[12px] text-[var(--text-secondary)]">
              Install OpenClaw to power the AI coding agent:
            </p>
            <code className="block text-[11px] font-mono bg-[var(--bg-secondary)] rounded px-2 py-1.5 text-[var(--brand)]">
              npm i -g openclaw
            </code>
          </div>
        )}

        {/* Info section */}
        <div className="space-y-3 pt-2">
          <h3 className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            What is the Gateway Engine?
          </h3>
          <div className="space-y-2 text-[12px] text-[var(--text-secondary)]">
            <div className="flex gap-2">
              <Icon icon="lucide:message-square" width={14} height={14} className="shrink-0 mt-0.5 text-[var(--brand)]" />
              <span>Powers the AI coding agent with streaming chat</span>
            </div>
            <div className="flex gap-2">
              <Icon icon="lucide:git-branch" width={14} height={14} className="shrink-0 mt-0.5 text-[var(--brand)]" />
              <span>Manages agent sessions with memory and context</span>
            </div>
            <div className="flex gap-2">
              <Icon icon="lucide:shield" width={14} height={14} className="shrink-0 mt-0.5 text-[var(--brand)]" />
              <span>Runs locally — your code never leaves your machine</span>
            </div>
            <div className="flex gap-2">
              <Icon icon="lucide:zap" width={14} height={14} className="shrink-0 mt-0.5 text-[var(--brand)]" />
              <span>Connects to any LLM provider (Anthropic, OpenAI, etc.)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
