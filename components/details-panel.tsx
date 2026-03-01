'use client'

import { useState, useEffect, useMemo } from 'react'
import { Icon } from '@iconify/react'
import { useRepo } from '@/context/repo-context'
import { useLocal } from '@/context/local-context'
import { useEditor } from '@/context/editor-context'
import { useGateway } from '@/context/gateway-context'

type Tab = 'details' | 'files'

export function DetailsPanel() {
  const { repo } = useRepo()
  const local = useLocal()
  const { files } = useEditor()
  const { status } = useGateway()
  const [tab, setTab] = useState<Tab>('details')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['workspace', 'changes', 'gateway']))

  const repoName = repo?.fullName?.split('/').pop() ?? local.rootPath?.split('/').pop() ?? '—'
  const fullPath = repo?.fullName ?? local.rootPath ?? '—'
  const branchName = repo?.branch ?? local.gitInfo?.branch ?? '—'
  const dirtyFiles = files.filter(f => f.dirty)

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const Section = ({ id, icon, title, children, badge }: {
    id: string; icon: string; title: string; children: React.ReactNode; badge?: string | number
  }) => {
    const expanded = expandedSections.has(id)
    return (
      <div className="border-b border-[var(--border)]">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
        >
          <Icon icon={icon} width={13} height={13} className="text-[var(--text-tertiary)] shrink-0" />
          <span className="text-[11px] font-semibold text-[var(--text-primary)] flex-1">{title}</span>
          {badge !== undefined && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-tertiary)]">{badge}</span>
          )}
          <Icon icon={expanded ? 'lucide:chevron-up' : 'lucide:chevron-down'} width={10} height={10} className="text-[var(--text-disabled)]" />
        </button>
        {expanded && (
          <div className="px-4 pb-3">
            {children}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-0 h-8 border-b border-[var(--border)] bg-[var(--bg-elevated)] shrink-0 px-2">
        {(['details', 'files'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 text-[10px] font-medium rounded transition-colors cursor-pointer ${
              tab === t
                ? 'text-[var(--text-primary)] bg-[var(--bg-subtle)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {t === 'details' ? 'Details' : 'Files'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'details' ? (
          <>
            {/* Workspace */}
            <Section id="workspace" icon="lucide:settings" title="Workspace">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:git-branch" width={11} height={11} className="text-[var(--text-disabled)] shrink-0" />
                  <span className="text-[10px] text-[var(--text-tertiary)] w-12">Branch</span>
                  <span className="text-[10px] font-mono text-[var(--text-primary)]">{branchName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:folder" width={11} height={11} className="text-[var(--text-disabled)] shrink-0" />
                  <span className="text-[10px] text-[var(--text-tertiary)] w-12">Path</span>
                  <span className="text-[10px] font-mono text-[var(--text-primary)] truncate">{repoName}</span>
                </div>
                {repo?.fullName && (
                  <div className="flex items-center gap-2">
                    <Icon icon="lucide:github" width={11} height={11} className="text-[var(--text-disabled)] shrink-0" />
                    <span className="text-[10px] text-[var(--text-tertiary)] w-12">Remote</span>
                    <span className="text-[10px] font-mono text-[var(--text-primary)] truncate">{repo.fullName}</span>
                  </div>
                )}
              </div>
            </Section>

            {/* Changes */}
            <Section id="changes" icon="lucide:git-commit-horizontal" title={`Changes on ${branchName}`} badge={dirtyFiles.length || undefined}>
              {dirtyFiles.length > 0 ? (
                <div className="space-y-1">
                  {dirtyFiles.map(f => (
                    <button
                      key={f.path}
                      onClick={() => window.dispatchEvent(new CustomEvent('file-select', { detail: { path: f.path, sha: f.sha } }))}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                    >
                      <span className="text-[9px] font-mono font-bold text-[var(--warning,#eab308)]">M</span>
                      <span className="text-[10px] font-mono text-[var(--text-secondary)] truncate">{f.path}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-[var(--text-disabled)]">No changes</p>
              )}
            </Section>

            {/* Gateway / MCP */}
            <Section id="gateway" icon="lucide:cpu" title="OpenClaw Gateway">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-[var(--color-additions)]' : 'bg-[var(--text-disabled)]'}`} />
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {status === 'connected' ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                {status !== 'connected' && (
                  <p className="text-[10px] text-[var(--text-disabled)]">Connect gateway to enable AI features</p>
                )}
              </div>
            </Section>

            {/* Open Files */}
            <Section id="openfiles" icon="lucide:files" title="Open Files" badge={files.length || undefined}>
              {files.length > 0 ? (
                <div className="space-y-0.5">
                  {files.map(f => (
                    <button
                      key={f.path}
                      onClick={() => window.dispatchEvent(new CustomEvent('file-select', { detail: { path: f.path, sha: f.sha } }))}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                    >
                      <Icon icon="lucide:file-code-2" width={10} height={10} className="text-[var(--text-disabled)] shrink-0" />
                      <span className="text-[10px] font-mono text-[var(--text-secondary)] truncate flex-1">{f.path.split('/').pop()}</span>
                      {f.dirty && <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning,#eab308)] shrink-0" />}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-[var(--text-disabled)]">No files open</p>
              )}
            </Section>
          </>
        ) : (
          /* Files tab — shows repo tree */
          <div className="py-2">
            {files.length > 0 ? (
              <div className="space-y-0.5 px-2">
                {files.map(f => (
                  <button
                    key={f.path}
                    onClick={() => window.dispatchEvent(new CustomEvent('file-select', { detail: { path: f.path, sha: f.sha } }))}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                  >
                    <Icon icon="lucide:file-code-2" width={11} height={11} className="text-[var(--text-tertiary)]" />
                    <span className="text-[10px] font-mono text-[var(--text-secondary)] flex-1 truncate">{f.path}</span>
                    {f.dirty && (
                      <span className="text-[8px] font-mono text-[var(--warning,#eab308)]">Modified</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <Icon icon="lucide:file-question" width={24} height={24} className="text-[var(--text-disabled)] mb-2" />
                <p className="text-[10px] text-[var(--text-disabled)]">No files in workspace</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
