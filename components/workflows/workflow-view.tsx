'use client'

import { Icon } from '@iconify/react'
import { useWorkflow } from '@/context/workflow-context'
import { WorkflowList } from './workflow-list'
import { WorkflowCanvas } from './workflow-canvas'
import { TraceViewer } from './trace-viewer'
import { AnalyticsDashboard } from './analytics-dashboard'

export function WorkflowView() {
  const { viewMode, setViewMode, activeWorkflow, activeTrace, setActiveWorkflow, setActiveTrace, analytics } = useWorkflow()

  const tabs: { id: typeof viewMode; label: string; icon: string; badge?: string }[] = [
    { id: 'workflows', label: 'Workflows', icon: 'lucide:workflow' },
    { id: 'traces', label: 'Traces', icon: 'lucide:list-tree' },
    { id: 'analytics', label: 'Analytics', icon: 'lucide:bar-chart-3', badge: analytics.runsToday > 0 ? String(analytics.runsToday) : undefined },
  ]

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg)] overflow-hidden">
      {/* Sub-navigation */}
      <div className="flex items-center h-10 px-4 border-b border-[var(--border)] bg-[var(--bg-elevated)] shrink-0 gap-1">
        {(activeWorkflow || activeTrace) && (
          <button
            onClick={() => { setActiveWorkflow(null); setActiveTrace(null) }}
            className="p-1.5 rounded-md hover:bg-[var(--bg-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] cursor-pointer mr-1 transition-colors"
          >
            <Icon icon="lucide:arrow-left" width={14} height={14} />
          </button>
        )}

        <div className="flex items-center gap-0.5 bg-[var(--bg)] rounded-lg p-0.5 border border-[var(--border)]">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setViewMode(t.id); setActiveWorkflow(null); setActiveTrace(null) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                viewMode === t.id
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-disabled)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Icon icon={t.icon} width={12} height={12} />
              {t.label}
              {t.badge && (
                <span className="ml-0.5 px-1.5 py-0 rounded-full text-[8px] font-bold bg-[var(--brand)] text-[var(--brand-contrast)]">{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {activeWorkflow && (
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-disabled)] font-mono">
            <Icon icon="lucide:workflow" width={10} height={10} />
            <span className="truncate max-w-[200px]">{activeWorkflow.name}</span>
          </div>
        )}
        {activeTrace && (
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-disabled)] font-mono">
            <Icon icon="lucide:list-tree" width={10} height={10} />
            <span className="truncate max-w-[200px]">{activeTrace.workflowName}</span>
            <Icon icon="lucide:chevron-right" width={8} height={8} />
            <span>{activeTrace.id.slice(0, 8)}</span>
          </div>
        )}
      </div>

      {/* Content — fills all remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === 'workflows' && (
          activeWorkflow ? <WorkflowCanvas /> : <WorkflowList />
        )}
        {viewMode === 'traces' && (
          activeTrace ? <TraceViewer /> : <TraceList />
        )}
        {viewMode === 'analytics' && <AnalyticsDashboard />}
      </div>
    </div>
  )
}

/* ── Trace List ──────────────────────────────────────────────── */
function TraceList() {
  const { traces, setActiveTrace } = useWorkflow()

  const statusConfig = (status: string) => {
    switch (status) {
      case 'completed': return { icon: 'lucide:check-circle', color: 'text-[var(--success)]', bg: 'bg-[color-mix(in_srgb,var(--success)_8%,transparent)]', label: 'Completed' }
      case 'failed': return { icon: 'lucide:x-circle', color: 'text-[var(--error)]', bg: 'bg-[color-mix(in_srgb,var(--error)_8%,transparent)]', label: 'Failed' }
      case 'running': return { icon: 'lucide:loader-2', color: 'text-[var(--brand)]', bg: 'bg-[color-mix(in_srgb,var(--brand)_8%,transparent)]', label: 'Running' }
      default: return { icon: 'lucide:circle', color: 'text-[var(--text-disabled)]', bg: 'bg-[var(--bg-subtle)]', label: 'Unknown' }
    }
  }

  const fmt = (ms: number) => ms < 1000 ? `${ms}ms` : ms < 60000 ? `${(ms / 1000).toFixed(1)}s` : `${(ms / 60000).toFixed(1)}m`

  const fmtTime = (ts: number) => {
    const diff = Date.now() - ts
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] shrink-0">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Execution Traces</h2>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{traces.length} trace{traces.length !== 1 ? 's' : ''} · Click to inspect</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {traces.length > 0 ? (
          <div className="p-5">
            {/* Column headers */}
            <div className="flex items-center gap-3 px-4 pb-2 mb-2 border-b border-[var(--border)] text-[9px] uppercase tracking-wider font-medium text-[var(--text-disabled)]">
              <span className="w-5" />
              <span className="flex-1">Workflow</span>
              <span className="w-20">Trigger</span>
              <span className="w-16 text-right">Duration</span>
              <span className="w-16 text-right">Tokens</span>
              <span className="w-14 text-right">Cost</span>
              <span className="w-12 text-right">Steps</span>
              <span className="w-20 text-right">Time</span>
            </div>

            <div className="space-y-1">
              {traces.map(trace => {
                const sc = statusConfig(trace.status)
                return (
                  <button
                    key={trace.id}
                    onClick={() => setActiveTrace(trace.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg-elevated)] border border-transparent hover:border-[var(--border)] transition-all cursor-pointer text-left group"
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${sc.bg}`}>
                      <Icon icon={sc.icon} width={12} height={12} className={`${sc.color} ${trace.status === 'running' ? 'animate-spin' : ''}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px] font-medium text-[var(--text-primary)] block truncate group-hover:text-[var(--brand)] transition-colors">{trace.workflowName}</span>
                    </div>
                    <span className="w-20 text-[10px] text-[var(--text-tertiary)] truncate">{trace.trigger || '—'}</span>
                    <span className="w-16 text-right text-[10px] font-mono text-[var(--text-tertiary)]">{trace.duration ? fmt(trace.duration) : '—'}</span>
                    <span className="w-16 text-right text-[10px] font-mono text-[var(--text-tertiary)]">{((trace.totalTokens.input + trace.totalTokens.output) / 1000).toFixed(1)}k</span>
                    <span className="w-14 text-right text-[10px] font-mono text-[var(--text-tertiary)]">${trace.totalCost.toFixed(3)}</span>
                    <span className="w-12 text-right text-[10px] text-[var(--text-disabled)]">{trace.steps.length}</span>
                    <span className="w-20 text-right text-[10px] text-[var(--text-disabled)]">{fmtTime(trace.startedAt)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-subtle)] flex items-center justify-center mb-4">
              <Icon icon="lucide:list-tree" width={28} height={28} className="text-[var(--text-disabled)]" />
            </div>
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">No traces yet</h3>
            <p className="text-[12px] text-[var(--text-tertiary)] max-w-[280px]">Run a workflow to see execution traces here with step-by-step timing and token usage.</p>
          </div>
        )}
      </div>
    </div>
  )
}
