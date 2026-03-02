'use client'

import { useState } from 'react'
import { Icon } from '@iconify/react'
import { useWorkflow, type TraceStep } from '@/context/workflow-context'
import { nodeKindIcon } from './workflow-list'

export function TraceViewer() {
  const { activeTrace } = useWorkflow()
  const [expandedStep, setExpandedStep] = useState<string | null>(null)

  if (!activeTrace) return null

  const fmt = (ms: number) => ms < 1000 ? `${ms}ms` : ms < 60000 ? `${(ms / 1000).toFixed(1)}s` : `${(ms / 60000).toFixed(1)}m`
  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const statusColor = (s: string) => {
    switch (s) {
      case 'success': return 'text-[var(--success)]'
      case 'error': return 'text-[var(--error)]'
      case 'running': return 'text-[var(--brand)]'
      default: return 'text-[var(--text-disabled)]'
    }
  }

  const statusBg = (s: string) => {
    switch (s) {
      case 'success': return 'bg-[color-mix(in_srgb,var(--success)_10%,transparent)]'
      case 'error': return 'bg-[color-mix(in_srgb,var(--error)_10%,transparent)]'
      case 'running': return 'bg-[color-mix(in_srgb,var(--brand)_10%,transparent)]'
      default: return 'bg-[var(--bg-subtle)]'
    }
  }

  const statusIcon = (s: string) => {
    switch (s) {
      case 'success': return 'lucide:check-circle'
      case 'error': return 'lucide:x-circle'
      case 'running': return 'lucide:loader-2'
      default: return 'lucide:circle'
    }
  }

  const traceStart = activeTrace.startedAt
  const traceEnd = activeTrace.endedAt ?? Date.now()
  const totalDuration = traceEnd - traceStart

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Summary bar */}
      <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--bg-elevated)] shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${statusBg(activeTrace.status)}`}>
            <Icon icon={statusIcon(activeTrace.status)} width={14} height={14} className={statusColor(activeTrace.status)} />
          </div>
          <span className="text-[14px] font-semibold text-[var(--text-primary)]">{activeTrace.workflowName}</span>
          {activeTrace.trigger && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--bg-subtle)] text-[var(--text-tertiary)] border border-[var(--border)]">
              {activeTrace.trigger}
            </span>
          )}
        </div>

        {/* Stats — responsive grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {activeTrace.duration != null && <Stat label="Duration" value={fmt(activeTrace.duration)} />}
          <Stat label="Steps" value={String(activeTrace.steps.length)} />
          <Stat label="Total Tokens" value={`${((activeTrace.totalTokens.input + activeTrace.totalTokens.output) / 1000).toFixed(1)}k`} />
          <Stat label="Input" value={`${(activeTrace.totalTokens.input / 1000).toFixed(1)}k`} />
          <Stat label="Output" value={`${(activeTrace.totalTokens.output / 1000).toFixed(1)}k`} />
          {activeTrace.totalCost > 0 && <Stat label="Cost" value={`$${activeTrace.totalCost.toFixed(3)}`} />}
        </div>
      </div>

      {/* Waterfall — fills remaining space */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-4">
          {/* Column headers */}
          <div className="flex items-center mb-2 text-[9px] text-[var(--text-disabled)] uppercase tracking-wider font-semibold">
            <span className="w-[220px] shrink-0">Step</span>
            <span className="flex-1 px-3">Timeline</span>
            <span className="w-[80px] text-right shrink-0">Duration</span>
          </div>

          <div className="space-y-0.5">
            {activeTrace.steps.map((step, idx) => {
              const isExpanded = expandedStep === step.id
              const stepStart = step.startedAt - traceStart
              const stepDuration = step.duration ?? 0
              const leftPct = totalDuration > 0 ? (stepStart / totalDuration) * 100 : 0
              const widthPct = totalDuration > 0 ? Math.max((stepDuration / totalDuration) * 100, 1.5) : 1.5

              const barColor = step.status === 'success' ? 'var(--success)' :
                step.status === 'error' ? 'var(--error)' :
                step.status === 'running' ? 'var(--brand)' : 'var(--text-disabled)'

              return (
                <div key={step.id}>
                  <button
                    onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                    className="w-full flex items-center py-2.5 px-3 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer group"
                  >
                    {/* Step info */}
                    <div className="w-[220px] shrink-0 flex items-center gap-2.5">
                      {/* Step number */}
                      <span className="w-5 h-5 rounded-md text-[9px] font-bold flex items-center justify-center bg-[var(--bg-subtle)] text-[var(--text-disabled)] shrink-0">{idx + 1}</span>
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${statusBg(step.status)}`}>
                        <Icon icon={nodeKindIcon(step.nodeKind)} width={12} height={12} className={statusColor(step.status)} />
                      </div>
                      <span className="text-[11px] font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--brand)] transition-colors">{step.nodeName}</span>
                      <Icon icon={isExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'} width={10} height={10} className="text-[var(--text-disabled)] shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Waterfall bar — uses all available space */}
                    <div className="flex-1 h-7 relative mx-3 rounded-md overflow-hidden bg-[var(--bg-subtle)]">
                      {/* Gridlines */}
                      {[25, 50, 75].map(pct => (
                        <div key={pct} className="absolute top-0 bottom-0 w-px bg-[var(--border)] opacity-40" style={{ left: `${pct}%` }} />
                      ))}
                      {/* Bar */}
                      <div
                        className="absolute top-1 bottom-1 rounded-md transition-all duration-300"
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          background: barColor,
                          opacity: 0.7,
                        }}
                      />
                      {step.status === 'running' && (
                        <div
                          className="absolute top-1 bottom-1 rounded-md animate-pulse"
                          style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: barColor, opacity: 0.3 }}
                        />
                      )}
                    </div>

                    {/* Duration */}
                    <span className="w-[80px] text-right text-[10px] font-mono text-[var(--text-tertiary)] shrink-0">
                      {step.duration ? fmt(step.duration) : '—'}
                    </span>
                  </button>

                  {/* Expanded detail panel */}
                  {isExpanded && (
                    <div className="ml-[232px] mr-[88px] mb-2 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-[10px] space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
                        <Detail label="Kind" value={step.nodeKind} />
                        <Detail label="Started" value={fmtTime(step.startedAt)} />
                        {step.model && <Detail label="Model" value={step.model} />}
                        {step.cost != null && <Detail label="Cost" value={`$${step.cost.toFixed(4)}`} />}
                        {step.tokens && (
                          <>
                            <Detail label="Input tokens" value={step.tokens.input.toLocaleString()} />
                            <Detail label="Output tokens" value={step.tokens.output.toLocaleString()} />
                          </>
                        )}
                      </div>

                      {step.error && (
                        <div className="p-3 rounded-lg bg-[color-mix(in_srgb,var(--error)_5%,transparent)] border border-[color-mix(in_srgb,var(--error)_15%,transparent)]">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon icon="lucide:x-circle" width={10} height={10} className="text-[var(--error)]" />
                            <span className="text-[9px] font-semibold text-[var(--error)] uppercase tracking-wider">Error</span>
                          </div>
                          <span className="text-[var(--error)] font-mono leading-relaxed">{step.error}</span>
                        </div>
                      )}

                      {step.toolCalls && step.toolCalls.length > 0 && (
                        <div>
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--text-disabled)] block mb-1.5">Tool Calls</span>
                          {step.toolCalls.map((tc, i) => (
                            <div key={i} className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] font-mono mb-1.5">
                              <span className="text-[var(--brand)] font-semibold">{tc.name}</span>
                              <span className="text-[var(--text-disabled)]"> → </span>
                              <span className="text-[var(--text-tertiary)]">{JSON.stringify(tc.result).slice(0, 120)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {step.output != null && !step.error && !step.toolCalls?.length && (
                        <div>
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--text-disabled)] block mb-1.5">Output</span>
                          <pre className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] font-mono text-[var(--text-secondary)] overflow-x-auto max-h-[200px] text-[9px] leading-relaxed">
                            {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[9px] uppercase tracking-wider font-medium text-[var(--text-disabled)] block mb-0.5">{label}</span>
      <span className="text-[13px] font-mono font-semibold text-[var(--text-primary)]">{value}</span>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--text-disabled)]">{label}</span>
      <span className="text-[var(--text-secondary)] font-mono font-medium">{value}</span>
    </div>
  )
}
