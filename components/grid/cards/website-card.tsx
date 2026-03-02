'use client'

import { useCallback, useState } from 'react'
import { Icon } from '@iconify/react'
import { useGrid, type GridCard } from '@/context/grid-context'

interface Props {
  card: GridCard
}

export function WebsiteCard({ card }: Props) {
  const { updateCard } = useGrid()
  const [urlInput, setUrlInput] = useState(card.url || '')
  const [iframeKey, setIframeKey] = useState(0)
  const [loadError, setLoadError] = useState(false)

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    let url = urlInput.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`
    setUrlInput(url)
    updateCard(card.id, { url })
    setLoadError(false)
    setIframeKey(k => k + 1)
  }, [urlInput, card.id, updateCard])

  const handleRefresh = useCallback(() => {
    setLoadError(false)
    setIframeKey(k => k + 1)
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* URL bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5 px-2 py-1.5 border-b border-[var(--border)]">
        <Icon icon="lucide:globe" width={13} height={13} className="text-[var(--text-disabled)] shrink-0" />
        <input
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          placeholder="Enter URL..."
          className="flex-1 text-[11px] bg-transparent text-[var(--text-primary)] border-none outline-none placeholder:text-[var(--text-disabled)]"
          onBlur={() => { if (urlInput.trim() && urlInput !== card.url) handleSubmit() }}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
        />
        {card.url && (
          <button
            type="button"
            onClick={handleRefresh}
            className="p-0.5 rounded text-[var(--text-disabled)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          >
            <Icon icon="lucide:refresh-cw" width={12} height={12} />
          </button>
        )}
        {card.url && (
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-0.5 rounded text-[var(--text-disabled)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <Icon icon="lucide:external-link" width={12} height={12} />
          </a>
        )}
      </form>

      {/* Content */}
      <div className="flex-1 min-h-0 relative">
        {card.url ? (
          loadError ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--text-disabled)]">
              <Icon icon="lucide:alert-circle" width={24} height={24} />
              <span className="text-xs">Cannot embed this site</span>
              <a href={card.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--brand)] hover:underline">
                Open in browser
              </a>
            </div>
          ) : (
            <iframe
              key={iframeKey}
              src={card.url}
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              onError={() => setLoadError(true)}
              title={card.title || 'Website'}
            />
          )
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--text-disabled)] text-xs">
            Enter a URL above to embed a website
          </div>
        )}
      </div>
    </div>
  )
}
