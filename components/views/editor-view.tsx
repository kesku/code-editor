'use client'

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useEditor } from '@/context/editor-context'
import { useLocal } from '@/context/local-context'
import { useRepo } from '@/context/repo-context'
import { useView } from '@/context/view-context'
import { useLayout, usePanelResize } from '@/context/layout-context'
import { EditorTabs } from '@/components/editor-tabs'

const FileExplorer = dynamic(() => import('@/components/file-explorer').then(m => ({ default: m.FileExplorer })), { ssr: false })
const CodeEditor = dynamic(() => import('@/components/code-editor').then(m => ({ default: m.CodeEditor })), { ssr: false })
const EnginePanel = dynamic(() => import('@/components/engine-panel').then(m => ({ default: m.EnginePanel })), { ssr: false })
const AgentPanel = dynamic(() => import('@/components/agent-panel').then(m => ({ default: m.AgentPanel })), { ssr: false })

const PANEL_SPRING = { type: 'spring' as const, stiffness: 500, damping: 35 }

const QUICK_ACTIONS = [
  { icon: 'lucide:file-search', label: 'Open File', shortcut: '\u2318P', event: 'quick-open' },
  { icon: 'lucide:folder', label: 'Browse Files', shortcut: '\u2318B', event: 'toggle-tree' },
  { icon: 'lucide:message-square', label: 'New Chat', shortcut: '\u2318L', event: 'open-side-chat' },
  { icon: 'lucide:terminal', label: 'Terminal', shortcut: '\u2318J', event: 'toggle-terminal' },
]

export function EditorView() {
  const { files, activeFile } = useEditor()
  const local = useLocal()
  const { repo } = useRepo()
  const { setView } = useView()
  const layout = useLayout()

  // Derived from layout context
  const treeVisible = layout.isVisible('tree')
  const treeWidth = layout.getSize('tree')
  const engineVisible = layout.isVisible('engine')
  const chatVisible = layout.isVisible('chat')
  const chatWidth = layout.getSize('chat')
  const editorCollapsed = layout.editorCollapsed

  // Resize hooks
  const treeResize = usePanelResize('tree')
  const chatResize = usePanelResize('chat')

  // Auto-expand editor when a file is opened
  useEffect(() => {
    if (files.length > 0 || activeFile) layout.setEditorCollapsed(false)
  }, [files.length, activeFile, layout])

  // ⌘B toggle tree, ⌘I toggle chat, ⌘E toggle editor collapse
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); layout.toggle('tree') }
      if ((e.metaKey || e.ctrlKey) && e.key === 'i' && !e.shiftKey) { e.preventDefault(); layout.toggle('chat') }
      if ((e.metaKey || e.ctrlKey) && e.key === 'e' && !e.shiftKey) { e.preventDefault(); layout.setEditorCollapsed(!editorCollapsed) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [layout, editorCollapsed])

  // Command palette events & open-side-chat are now handled by LayoutContext's event bridge

  // ─── Status chip state ───
  const [terminalActive, setTerminalActive] = useState(false)
  const [agentUnread, setAgentUnread] = useState(false)
  const [engineRunning, setEngineRunning] = useState(false)

  useEffect(() => {
    const onTerminal = (e: Event) => setTerminalActive((e as CustomEvent).detail?.active ?? true)
    const onAgent = () => { if (!chatVisible) setAgentUnread(true) }
    const onEngine = (e: Event) => setEngineRunning((e as CustomEvent).detail?.running ?? false)
    window.addEventListener('terminal-activity', onTerminal)
    window.addEventListener('agent-reply', onAgent)
    window.addEventListener('engine-status', onEngine)
    return () => {
      window.removeEventListener('terminal-activity', onTerminal)
      window.removeEventListener('agent-reply', onAgent)
      window.removeEventListener('engine-status', onEngine)
    }
  }, [chatVisible])

  // Clear unread when chat opens
  useEffect(() => { if (chatVisible) setAgentUnread(false) }, [chatVisible])

  // ─── Active rail ref ───
  const segmentRef = useRef<HTMLDivElement>(null)
  const [railStyle, setRailStyle] = useState<{ left: number; width: number } | null>(null)

  const updateRail = useCallback(() => {
    if (!segmentRef.current) return
    const active = segmentRef.current.querySelector('[data-active="true"]') as HTMLElement | null
    if (active) {
      setRailStyle({ left: active.offsetLeft, width: active.offsetWidth })
    } else {
      setRailStyle(null)
    }
  }, [])

  useLayoutEffect(() => { updateRail() }, [treeVisible, engineVisible, updateRail])

  const hasFiles = files.length > 0 || activeFile
  const branchName = repo?.branch ?? local.gitInfo?.branch ?? null

  const handleQuickAction = useCallback((event: string) => {
    switch (event) {
      case 'quick-open':
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', metaKey: true }))
        break
      case 'toggle-tree':
        layout.show('tree')
        break
      case 'open-side-chat':
        layout.show('chat')
        requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('focus-agent-input')))
        break
      case 'toggle-terminal':
        layout.toggle('terminal')
        break
    }
  }, [layout])

  return (
    <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden relative">
      {/* ── Editor collapsed: narrow toggle strip ── */}
      {editorCollapsed ? (
        <div className="flex flex-col items-center w-[48px] shrink-0 bg-[var(--bg-elevated)] border-r border-[var(--border)]">
          <button
            onClick={() => layout.setEditorCollapsed(false)}
            className="mt-3 p-2 rounded-md hover:bg-[var(--bg-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            title="Expand editor (⌘E)"
          >
            <Icon icon="lucide:code-2" width={18} height={18} />
          </button>
          <button
            onClick={() => { layout.setEditorCollapsed(false); layout.show('tree') }}
            className="mt-1 p-2 rounded-md hover:bg-[var(--bg-subtle)] text-[var(--text-disabled)] hover:text-[var(--text-tertiary)] transition-colors cursor-pointer"
            title="Open explorer (⌘B)"
          >
            <Icon icon="lucide:folder" width={16} height={16} />
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-terminal'))}
            className="mt-1 p-2 rounded-md hover:bg-[var(--bg-subtle)] text-[var(--text-disabled)] hover:text-[var(--text-tertiary)] transition-colors cursor-pointer"
            title="Terminal (⌘J)"
          >
            <Icon icon="lucide:terminal" width={16} height={16} />
          </button>
        </div>
      ) : (
        <>
          {/* File Tree — animated */}
          <AnimatePresence initial={false}>
            {treeVisible && (
              <motion.div
                key="file-tree"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: treeWidth, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={PANEL_SPRING}
                className="shrink-0 bg-[var(--sidebar-bg)] overflow-hidden border-r border-[var(--border)] flex flex-col"
              >
                <div className="flex items-center justify-between h-7 px-2.5 border-b border-[var(--border)] shrink-0">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-disabled)]">Explorer</span>
                  <button onClick={() => layout.hide('tree')} className="p-1 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)] text-[var(--text-disabled)] hover:text-[var(--text-tertiary)] cursor-pointer" title="Hide (⌘B)">
                    <Icon icon="lucide:panel-left-close" width={13} height={13} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto"><FileExplorer /></div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tree resize handle */}
          {treeVisible && (
            <div className="resize-handle w-[3px] cursor-col-resize hover:bg-[var(--brand)] transition-all opacity-0 hover:opacity-50 shrink-0 z-10"
              onMouseDown={treeResize.onResizeStart}
            />
          )}

          {/* Editor column */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {/* Tree toggle when collapsed */}
            {!treeVisible && (
              <button onClick={() => layout.show('tree')} className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-4 h-10 flex items-center justify-center bg-[var(--bg-elevated)] border border-l-0 border-[var(--border)] rounded-r hover:bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)] text-[var(--text-disabled)] hover:text-[var(--text-tertiary)] cursor-pointer" title="Show explorer (⌘B)">
                  <Icon icon="lucide:chevron-right" width={12} height={12} />
              </button>
            )}

            {hasFiles ? (
              <>
                {/* Tabs */}
                <EditorTabs />

                {/* Editor */}
                <div className="flex-1 min-h-0 flex flex-col">
                  <CodeEditor />
                </div>

                {/* Engine panel */}
                {engineVisible && (
                  <>
                    <div className="h-[3px] cursor-row-resize hover:bg-[var(--brand)] transition-colors opacity-0 hover:opacity-50 shrink-0"
                      onMouseDown={e => {
                        e.preventDefault(); const startY = e.clientY; const startH = 240
                        const onMove = (ev: MouseEvent) => { /* engine resize handled locally */ }
                        const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
                        document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
                      }}
                    />
                    <div className="shrink-0 border-t border-[var(--border)]" style={{ height: 240 }}>
                      <EnginePanel />
                    </div>
                  </>
                )}
              </>
            ) : (
              /* Smart empty state */
              <div className="flex-1 flex flex-col items-center justify-center gap-6">
                {/* Animated icon with subtle glow */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-20 h-20 rounded-full bg-[var(--brand)] opacity-[0.06] blur-xl animate-breathe" />
                  <Icon icon="lucide:code-2" width={40} height={40} className="text-[var(--text-disabled)] opacity-40 animate-breathe" />
                </div>

                <p className="text-[13px] text-[var(--text-tertiary)]">Start building something</p>

                {/* Quick action grid */}
                <div className="grid grid-cols-2 gap-2 w-[340px]">
                  {QUICK_ACTIONS.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleQuickAction(item.event)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg-elevated)_60%,transparent)] hover:bg-[var(--bg-subtle)] hover:border-[var(--text-disabled)] transition-all duration-200 cursor-pointer group"
                    >
                      <Icon icon={item.icon} width={16} height={16} className="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] shrink-0" />
                      <span className="flex-1 text-left text-[12px] text-[var(--text-secondary)] font-medium">{item.label}</span>
                      <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-disabled)] shrink-0">{item.shortcut}</kbd>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom bar */}
            <div className="flex items-center h-8 px-2.5 border-t border-[var(--border)] bg-[var(--bg-elevated)] shrink-0 gap-1.5">
              {/* Segmented toggle group with animated active rail */}
              <div ref={segmentRef} className="relative inline-flex items-center rounded-md bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)] p-[2px] gap-[2px]">
                {/* Active rail indicator */}
                {railStyle && (
                  <span
                    className="absolute top-[2px] h-[calc(100%-4px)] rounded bg-[var(--bg)] shadow-sm pointer-events-none transition-all duration-200 ease-out z-0"
                    style={{ left: railStyle.left, width: railStyle.width }}
                  />
                )}

                <button data-active={treeVisible} onClick={() => layout.toggle('tree')} className={`relative z-[1] h-6 px-2 rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${treeVisible ? 'text-[var(--text-primary)]' : 'text-[var(--text-disabled)] hover:text-[var(--text-secondary)]'}`} title="Explorer (⌘B)">
                  <Icon icon="lucide:folder" width={12} height={12} />
                  <span>Files</span>
                </button>
                <button onClick={() => layout.toggle('terminal')} className="relative z-[1] h-6 px-2 rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors text-[var(--text-disabled)] hover:text-[var(--text-secondary)]" title="Terminal (⌘J)">
                  <Icon icon="lucide:terminal" width={12} height={12} />
                  <span>Terminal</span>
                  {terminalActive && <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />}
                </button>
                <button data-active={engineVisible} onClick={() => layout.toggle('engine')} className={`relative z-[1] h-6 px-2 rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${engineVisible ? 'text-[var(--text-primary)]' : 'text-[var(--text-disabled)] hover:text-[var(--text-secondary)]'}`} title="Engine">
                  <Icon icon="lucide:cpu" width={12} height={12} />
                  <span>Engine</span>
                  {engineRunning && <Icon icon="lucide:loader-2" width={9} height={9} className="animate-spin text-[var(--brand)]" />}
                </button>
              </div>

              <button onClick={() => layout.setEditorCollapsed(true)} className="h-6 px-2 rounded text-[10px] flex items-center gap-1 hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)] cursor-pointer text-[var(--text-disabled)]" title="Collapse editor (⌘E)">
                <Icon icon="lucide:panel-left-close" width={12} height={12} />
                <span>Collapse</span>
              </button>

              <div className="flex-1" />

              {branchName && (
                <span className="text-[10px] font-mono text-[var(--text-disabled)] flex items-center gap-1 ml-1">
                  <Icon icon="lucide:git-branch" width={12} height={12} />{branchName}
                </span>
              )}

              <button onClick={() => layout.toggle('chat')} className={`relative h-6 px-2 rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${chatVisible ? 'bg-[color-mix(in_srgb,var(--brand)_14%,transparent)] text-[var(--brand)]' : 'text-[var(--text-disabled)] hover:text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]'}`} title="Chat (⌘I)">
                <Icon icon="lucide:message-square" width={12} height={12} />
                <span>Agent</span>
                {agentUnread && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--brand)] animate-pulse ring-2 ring-[var(--bg-elevated)]" />
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Chat resize handle */}
      {chatVisible && !editorCollapsed && (
        <div className="resize-handle w-[3px] cursor-col-resize hover:bg-[var(--brand)] transition-all opacity-0 hover:opacity-50 shrink-0 z-10"
          onMouseDown={chatResize.onResizeStart}
        />
      )}

      {/* Chat panel — animated open/close */}
      <AnimatePresence initial={false}>
        {chatVisible && (
          <motion.div
            key="chat-panel"
            initial={editorCollapsed ? { opacity: 0 } : { width: 0, opacity: 0 }}
            animate={editorCollapsed ? { opacity: 1 } : { width: chatWidth, opacity: 1 }}
            exit={editorCollapsed ? { opacity: 0 } : { width: 0, opacity: 0 }}
            transition={PANEL_SPRING}
            className={`shrink-0 flex flex-col border-l border-[var(--border)] bg-[var(--bg)] overflow-hidden ${editorCollapsed ? 'flex-1' : ''}`}
          >
            <div className="flex items-center justify-between h-7 px-2.5 border-b border-[var(--border)] bg-[var(--bg-elevated)] shrink-0">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-disabled)] flex items-center gap-1.5">
                <Icon icon="lucide:bot" width={12} height={12} className="text-[var(--brand)]" />
                Agent
              </span>
              <button onClick={() => layout.hide('chat')} className="p-1 rounded hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)] text-[var(--text-disabled)] hover:text-[var(--text-tertiary)] cursor-pointer" title="Hide (⌘I)">
                <Icon icon="lucide:panel-right-close" width={13} height={13} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <AgentPanel />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
