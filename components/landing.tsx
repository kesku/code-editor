'use client'

import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'

export default function Landing({ onEnter }: { onEnter?: () => void }) {
  const [ready, setReady] = useState(false)
  const [isTauriDesktop, setIsTauriDesktop] = useState(false)
  const [isMacTauri, setIsMacTauri] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setReady(true))

    const w = window as Window & { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }
    const inTauri = Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__)
    setIsTauriDesktop(inTauri)
    setIsMacTauri(inTauri && navigator.userAgent.includes('Mac'))
  }, [])

  const handleEnter = useCallback(() => {
    if (onEnter) onEnter()
    else window.location.href = '/sign-in'
  }, [onEnter])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
        e.preventDefault()
        handleEnter()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleEnter])

  return (
    <div
      className={`landing-root ${ready ? 'landing-ready' : ''}`}
      data-tauri-drag-region={isTauriDesktop || undefined}
    >
      {/* Subtle ambient glow */}
      <div className="landing-glow" aria-hidden="true" />

      {/* Top bar — mirrors the editor header feel */}
      <header
        data-tauri-drag-region
        className={`landing-header ${isTauriDesktop ? 'tauri-drag-region' : ''} ${isMacTauri ? 'landing-header-mac' : ''}`}
      >
        <div className="landing-header-left">
          <div className="landing-logo-mark">
            <Icon icon="lucide:code" width={16} height={16} />
          </div>
          <span className="landing-wordmark">Code Editor</span>
        </div>
        <div className={`landing-header-right ${isTauriDesktop ? 'tauri-no-drag' : ''}`}>
          <a
            href="https://github.com/OpenKnots/code-editor"
            target="_blank"
            rel="noopener noreferrer"
            className="landing-header-link"
          >
            <Icon icon="lucide:github" width={14} height={14} />
          </a>
        </div>
      </header>

      {/* Centered content */}
      <main className="landing-center">
        <div className="landing-icon-ring">
          <Icon icon="lucide:code" width={28} height={28} className="landing-icon" />
        </div>

        <h1 className="landing-title">
          Code Editor
        </h1>

        <p className="landing-subtitle">
          Gateway-powered editor with an integrated AI agent.
          <br className="hidden sm:inline" />
          Edit local or remote files, get completions, review diffs, and commit.
        </p>

        <div className="landing-actions">
          <button onClick={handleEnter} className="landing-btn-primary">
            Open Editor
            <Icon icon="lucide:arrow-right" width={14} height={14} />
          </button>
        </div>

        <div className="landing-hints">
          <span className="landing-hint">
            <kbd>Enter</kbd> to open
          </span>
          <span className="landing-hint-sep" />
          <span className="landing-hint">
            <kbd>⌘</kbd><kbd>K</kbd> command palette
          </span>
        </div>
      </main>

      {/* Bottom status */}
      <footer className="landing-footer">
        <span className="landing-footer-item">
          <Icon icon="lucide:shield-check" width={11} height={11} />
          Zero-backend
        </span>
        <span className="landing-footer-sep" />
        <span className="landing-footer-item">
          <Icon icon="lucide:hard-drive" width={11} height={11} />
          Local + Remote
        </span>
        <span className="landing-footer-sep" />
        <span className="landing-footer-item">
          <Icon icon="lucide:sparkles" width={11} height={11} />
          AI Agent
        </span>
        <span className="landing-footer-sep" />
        <a
          href="https://github.com/OpenKnots/code-editor"
          target="_blank"
          rel="noopener noreferrer"
          className="landing-footer-link"
        >
          GitHub
        </a>
      </footer>
    </div>
  )
}
