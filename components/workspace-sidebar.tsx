'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLayout, usePanelResize } from '@/context/layout-context'
import { isTauri } from '@/lib/tauri'

const SIDEBAR_SPRING = { type: 'spring' as const, stiffness: 500, damping: 35 }

interface Props {
  collapsed?: boolean
  onToggle?: () => void
  repoName?: string
}

export function WorkspaceSidebar({ collapsed, onToggle, repoName }: Props) {
  const layout = useLayout()
  const sidebarResize = usePanelResize('sidebar')
  const sidebarWidth = layout.getSize('sidebar')
  const [isTauriDesktop, setIsTauriDesktop] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setIsTauriDesktop(isTauri()) }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        onToggle?.()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onToggle])

  return (
    <motion.div
      ref={collapsed ? undefined : sidebarRef}
      initial={false}
      animate={{ width: collapsed ? 48 : sidebarWidth }}
      transition={SIDEBAR_SPRING}
      className={`relative flex flex-col shrink-0 overflow-hidden ${
        collapsed
          ? `items-center gap-3 ${isTauriDesktop ? 'pt-8' : 'pt-3'} pb-3`
          : 'h-full bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-xl'
      }`}
    >
      {collapsed ? (
        <>
          <button onClick={onToggle} className="p-2.5 rounded-xl hover:bg-[var(--bg-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer" title="Expand sidebar (⌘\\)">
            <Icon icon="lucide:panel-left" width={20} height={20} />
          </button>

          {/* Collapsed quick actions */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-folder'))}
            className="p-2.5 rounded-xl hover:bg-[var(--bg-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            title="Open Folder"
          >
            <Icon icon="lucide:folder-open" width={20} height={20} />
          </button>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-git-panel'))}
            className="p-2.5 rounded-xl hover:bg-[var(--bg-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            title="Source Control"
          >
            <Icon icon="lucide:git-branch" width={20} height={20} />
          </button>
        </>
      ) : (
        <>
          {/* Header */}
          <div className={`flex items-center justify-between px-4 h-14 shrink-0 ${isTauriDesktop ? 'pt-5' : ''}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon icon="lucide:code-2" width={18} height={18} className="text-[var(--brand)] shrink-0" />
              <span className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
                {repoName || 'Knot Code'}
              </span>
            </div>
            <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-disabled)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer" title="Collapse sidebar (⌘\\)">
              <Icon icon="lucide:panel-left-close" width={16} height={16} />
            </button>
          </div>

          {/* Quick actions */}
          <div className="px-3 space-y-0.5 mt-1">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-folder'))}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Icon icon="lucide:folder-open" width={16} height={16} className="text-[var(--text-tertiary)]" />
              Open Folder
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-git-panel'))}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Icon icon="lucide:git-branch" width={16} height={16} className="text-[var(--text-tertiary)]" />
              Source Control
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Resize handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--brand)] transition-all z-10 opacity-0 hover:opacity-60 hover:w-1.5"
            onMouseDown={sidebarResize.onResizeStart}
          />
        </>
      )}
    </motion.div>
  )
}
