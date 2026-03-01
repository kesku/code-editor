'use client'

import { useRef, useLayoutEffect, useState } from 'react'
import { Icon } from '@iconify/react'

export type AgentMode = 'plan' | 'code' | 'agent'

const MODES: Array<{ id: AgentMode; label: string; icon: string; desc: string }> = [
  { id: 'plan', label: 'Plan', icon: 'lucide:list-checks', desc: 'Discuss and plan before coding' },
  { id: 'code', label: 'Code', icon: 'lucide:code', desc: 'Direct code changes' },
  { id: 'agent', label: 'Agent', icon: 'lucide:infinity', desc: 'Autonomous multi-step agent' },
]

interface Props {
  mode: AgentMode
  onChange: (mode: AgentMode) => void
}

export function ModeSelector({ mode, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [pill, setPill] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const idx = MODES.findIndex(m => m.id === mode)
    const btn = btnRefs.current[idx]
    const container = containerRef.current
    if (btn && container) {
      const cRect = container.getBoundingClientRect()
      const bRect = btn.getBoundingClientRect()
      setPill({ left: bRect.left - cRect.left, width: bRect.width })
    }
  }, [mode])

  return (
    <div ref={containerRef} className="relative flex items-center gap-0.5 p-0.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)]">
      <span
        className="absolute top-0.5 h-[calc(100%-4px)] rounded-full bg-[var(--bg)] shadow-sm border border-[var(--border)] pointer-events-none"
        style={{
          left: pill.left,
          width: pill.width,
          transition: 'left 280ms cubic-bezier(0.34, 1.56, 0.64, 1), width 280ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          opacity: pill.width > 0 ? 1 : 0,
        }}
      />
      {MODES.map((m, i) => (
        <button
          key={m.id}
          ref={el => { btnRefs.current[i] = el }}
          onClick={() => onChange(m.id)}
          className={`relative z-[1] flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium transition-colors duration-200 cursor-pointer border border-transparent ${
            mode === m.id
              ? 'text-[var(--text-primary)]'
              : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
          }`}
          title={m.desc}
        >
          <Icon icon={m.icon} width={14} height={14} />
          {m.label}
        </button>
      ))}
    </div>
  )
}
