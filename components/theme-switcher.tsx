'use client'

import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'

const THEMES = [
  { id: 'obsidian', label: 'Obsidian', color: '#ca3a29' },
  { id: 'neon', label: 'Neon', color: '#a855f7' },
  { id: 'catppuccin-mocha', label: 'Catppuccin', color: '#cba6f7' },
  { id: 'bone', label: 'Bone', color: '#78716c' },
] as const

const STORAGE_KEY = 'code-editor:theme'

export function ThemeSwitcher() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('obsidian')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setCurrent(saved)
        document.documentElement.setAttribute('data-theme', saved)
      }
    } catch {}
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectTheme = (id: string) => {
    setCurrent(id)
    document.documentElement.setAttribute('data-theme', id)
    try { localStorage.setItem(STORAGE_KEY, id) } catch {}
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
        title="Switch theme"
      >
        <Icon icon="lucide:palette" width={15} height={15} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] shadow-xl z-50 py-1 animate-fade-in-up">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => selectTheme(t.id)}
              className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-left transition-colors cursor-pointer ${
                current === t.id
                  ? 'bg-[color-mix(in_srgb,var(--brand)_10%,transparent)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0 border border-[var(--border)]"
                style={{ backgroundColor: t.color }}
              />
              <span className="text-[12px]">{t.label}</span>
              {current === t.id && (
                <Icon icon="lucide:check" width={12} height={12} className="ml-auto text-[var(--brand)]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
