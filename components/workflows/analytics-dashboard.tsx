'use client'

import { Icon } from '@iconify/react'
import { useWorkflow } from '@/context/workflow-context'

export function AnalyticsDashboard() {
  const { analytics } = useWorkflow()

  const fmt = (ms: number) => ms < 1000 ? `${ms}ms` : ms < 60000 ? `${(ms / 1000).toFixed(1)}s` : `${(ms / 60000).toFixed(1)}m`
  const maxRuns = Math.max(...analytics.runsByDay.map(d => d.runs), 1)
  const totalModelCost = analytics.tokensByModel.reduce((a, b) => a + b.cost, 0) || 1

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] shrink-0">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Analytics</h2>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Usage, cost, and performance insights</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-disabled)] bg-[var(--bg-subtle)] px-2.5 py-1 rounded-md font-medium">Last 7 days</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-5">
          {/* KPI row — always 4 columns, fill width */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon="lucide:play" iconColor="text-[var(--brand)]" label="Total Runs" value={String(analytics.totalRuns)} sub={`${analytics.runsToday} today`} />
            <KpiCard icon="lucide:check-circle" iconColor="text-[var(--success)]" label="Success Rate" value={`${analytics.successRate.toFixed(1)}%`} sub={analytics.successRate > 90 ? '↑ healthy' : '↓ needs attention'} subColor={analytics.successRate > 90 ? 'text-[var(--success)]' : 'text-[var(--warning)]'} />
            <KpiCard icon="lucide:coins" iconColor="text-[var(--warning)]" label="Total Cost" value={`$${analytics.totalCost.toFixed(2)}`} sub={`$${analytics.costToday.toFixed(3)} today`} />
            <KpiCard icon="lucide:zap" iconColor="text-[var(--info)]" label="Avg Duration" value={fmt(analytics.avgDuration)} sub={`${((analytics.totalTokens) / 1000).toFixed(0)}k total tokens`} />
          </div>

          {/* Main charts — fill width */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Runs per day — takes 2/3 on wide */}
            <div className="xl:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:bar-chart-3" width={14} height={14} className="text-[var(--brand)]" />
                  <span className="text-[12px] font-semibold text-[var(--text-primary)]">Runs per Day</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-[9px] text-[var(--text-disabled)]">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[var(--brand)] opacity-70" /> Success
                  </span>
                  <span className="flex items-center gap-1.5 text-[9px] text-[var(--text-disabled)]">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[var(--error)] opacity-60" /> Failed
                  </span>
                </div>
              </div>
              {/* Taller chart area */}
              <div className="flex items-end gap-2 h-[160px]">
                {analytics.runsByDay.map((day, i) => {
                  const successH = (day.success / maxRuns) * 140
                  const failedH = (day.failed / maxRuns) * 140
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group cursor-default">
                      <div className="w-full flex flex-col items-stretch justify-end" style={{ height: 140 }}>
                        <div className="relative">
                          {/* Tooltip on hover */}
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border)] text-[8px] font-mono text-[var(--text-primary)] whitespace-nowrap shadow-sm z-10">
                            {day.success}✓ {day.failed}✗
                          </div>
                          {day.failed > 0 && (
                            <div className="w-full rounded-t-sm mb-0.5" style={{ height: `${failedH}px`, background: 'var(--error)', opacity: 0.55 }} />
                          )}
                          <div className="w-full rounded-t-md group-hover:opacity-100 transition-opacity" style={{ height: `${successH}px`, background: 'var(--brand)', opacity: 0.65 }} />
                        </div>
                      </div>
                      <span className="text-[9px] text-[var(--text-disabled)] font-medium">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Cost by model — 1/3 on wide, stacked */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Icon icon="lucide:cpu" width={14} height={14} className="text-[var(--brand)]" />
                <span className="text-[12px] font-semibold text-[var(--text-primary)]">Cost by Model</span>
              </div>
              <div className="space-y-4 flex-1">
                {analytics.tokensByModel.map(m => {
                  const pct = (m.cost / totalModelCost) * 100
                  return (
                    <div key={m.model}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[var(--brand)]" style={{ opacity: 0.4 + pct / 150 }} />
                          <span className="text-[11px] font-medium text-[var(--text-primary)]">{m.model.split('-').slice(-2).join(' ')}</span>
                        </div>
                        <span className="text-[10px] font-mono text-[var(--text-tertiary)]">${m.cost.toFixed(2)}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-[var(--bg)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--brand)] transition-all duration-700"
                          style={{ width: `${pct}%`, opacity: 0.5 + pct / 200 }}
                        />
                      </div>
                      <span className="text-[9px] text-[var(--text-disabled)] mt-0.5 block">{(m.tokens / 1000).toFixed(0)}k tokens · {pct.toFixed(0)}% of spend</span>
                    </div>
                  )
                })}
              </div>
              {/* Total */}
              <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-[10px] font-medium text-[var(--text-tertiary)]">Total</span>
                <span className="text-[13px] font-bold font-mono text-[var(--text-primary)]">${analytics.totalCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Bottom row — fill width */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Top workflows — table-like */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Icon icon="lucide:trophy" width={14} height={14} className="text-[var(--warning)]" />
                <span className="text-[12px] font-semibold text-[var(--text-primary)]">Top Workflows</span>
              </div>

              {/* Column headers */}
              <div className="flex items-center gap-3 px-2 pb-2 mb-1 border-b border-[var(--border)] text-[9px] uppercase tracking-wider font-medium text-[var(--text-disabled)]">
                <span className="w-5">#</span>
                <span className="flex-1">Workflow</span>
                <span className="w-14 text-right">Runs</span>
                <span className="w-16 text-right">Avg Time</span>
                <span className="w-14 text-right">Rate</span>
              </div>

              <div className="space-y-0.5">
                {analytics.topWorkflows.map((wf, i) => (
                  <div key={wf.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors">
                    <span className="w-5 text-center text-[11px] font-bold text-[var(--text-disabled)]">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-medium text-[var(--text-primary)] block truncate">{wf.name}</span>
                    </div>
                    <span className="w-14 text-right text-[10px] font-mono text-[var(--text-tertiary)]">{wf.runs}</span>
                    <span className="w-16 text-right text-[10px] font-mono text-[var(--text-tertiary)]">{fmt(wf.avgDuration)}</span>
                    <span className={`w-14 text-right text-[11px] font-mono font-semibold ${
                      wf.successRate > 90 ? 'text-[var(--success)]' : wf.successRate > 70 ? 'text-[var(--warning)]' : 'text-[var(--error)]'
                    }`}>
                      {wf.successRate.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent errors */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Icon icon="lucide:alert-triangle" width={14} height={14} className="text-[var(--error)]" />
                <span className="text-[12px] font-semibold text-[var(--text-primary)]">Recent Errors</span>
                {analytics.recentErrors.length > 0 && (
                  <span className="ml-auto text-[9px] font-medium px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--error)_10%,transparent)] text-[var(--error)]">
                    {analytics.recentErrors.length}
                  </span>
                )}
              </div>
              {analytics.recentErrors.length > 0 ? (
                <div className="space-y-3">
                  {analytics.recentErrors.map((err, i) => (
                    <div key={i} className="p-3 rounded-lg bg-[color-mix(in_srgb,var(--error)_3%,var(--bg))] border border-[color-mix(in_srgb,var(--error)_12%,var(--border))]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-[var(--text-primary)]">{err.workflowName}</span>
                        <span className="text-[9px] text-[var(--text-disabled)]">
                          {Math.floor((Date.now() - err.timestamp) / 86400000)}d ago
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icon icon="lucide:x-circle" width={11} height={11} className="text-[var(--error)] mt-0.5 shrink-0" />
                        <span className="text-[10px] font-mono text-[var(--error)] leading-relaxed">{err.error}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--success)_8%,transparent)] flex items-center justify-center mb-2">
                    <Icon icon="lucide:check-circle" width={20} height={20} className="text-[var(--success)] opacity-60" />
                  </div>
                  <span className="text-[11px] text-[var(--text-disabled)]">No recent errors 🎉</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon, iconColor, label, value, sub, subColor }: { icon: string; iconColor: string; label: string; value: string; sub?: string; subColor?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-disabled)]">{label}</span>
        <div className="w-7 h-7 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center">
          <Icon icon={icon} width={14} height={14} className={iconColor} />
        </div>
      </div>
      <div className="text-[22px] font-bold text-[var(--text-primary)] font-mono leading-none mb-1.5">{value}</div>
      {sub && (
        <span className={`text-[10px] ${subColor || 'text-[var(--text-tertiary)]'}`}>{sub}</span>
      )}
    </div>
  )
}
