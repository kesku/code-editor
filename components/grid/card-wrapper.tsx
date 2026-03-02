'use client'

import { useCallback, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { useGrid, type GridCard } from '@/context/grid-context'
import { TextCard } from './cards/text-card'
import { AiCard } from './cards/ai-card'
import { WebsiteCard } from './cards/website-card'
import { GridLinkCard } from './cards/grid-link-card'

const CARD_ICONS: Record<GridCard['type'], string> = {
  text: 'lucide:file-text',
  ai: 'lucide:sparkles',
  website: 'lucide:globe',
  link: 'lucide:link',
}

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const RESIZE_CURSORS: Record<ResizeDir, string> = {
  n: 'ns-resize', s: 'ns-resize',
  e: 'ew-resize', w: 'ew-resize',
  ne: 'nesw-resize', sw: 'nesw-resize',
  nw: 'nwse-resize', se: 'nwse-resize',
}

interface Props {
  card: GridCard
  zoom: number
}

export function CardWrapper({ card, zoom }: Props) {
  const { removeCard, moveCard, resizeCard, bringToFront, selectedCardId, setSelectedCardId } = useGrid()
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef<{ x: number; y: number; cardX: number; cardY: number } | null>(null)
  const resizeStart = useRef<{ x: number; y: number; w: number; h: number; cardX: number; cardY: number; dir: ResizeDir } | null>(null)
  const isSelected = selectedCardId === card.id

  const handleTitleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    setSelectedCardId(card.id)
    bringToFront(card.id)
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, cardX: card.x, cardY: card.y }

    const onMove = (ev: MouseEvent) => {
      if (!dragStart.current) return
      const dx = (ev.clientX - dragStart.current.x) / zoom
      const dy = (ev.clientY - dragStart.current.y) / zoom
      moveCard(card.id, dragStart.current.cardX + dx, dragStart.current.cardY + dy)
    }
    const onUp = () => {
      setIsDragging(false)
      dragStart.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [card.id, card.x, card.y, zoom, moveCard, bringToFront, setSelectedCardId])

  const handleResizeMouseDown = useCallback((dir: ResizeDir) => (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    resizeStart.current = { x: e.clientX, y: e.clientY, w: card.width, h: card.height, cardX: card.x, cardY: card.y, dir }

    const onMove = (ev: MouseEvent) => {
      if (!resizeStart.current) return
      const s = resizeStart.current
      const dx = (ev.clientX - s.x) / zoom
      const dy = (ev.clientY - s.y) / zoom
      let newW = s.w, newH = s.h, newX = s.cardX, newY = s.cardY

      if (dir.includes('e')) newW = s.w + dx
      if (dir.includes('w')) { newW = s.w - dx; newX = s.cardX + dx }
      if (dir.includes('s')) newH = s.h + dy
      if (dir.includes('n')) { newH = s.h - dy; newY = s.cardY + dy }

      newW = Math.max(150, newW)
      newH = Math.max(100, newH)
      if (newW === 150 && dir.includes('w')) newX = s.cardX + s.w - 150
      if (newH === 100 && dir.includes('n')) newY = s.cardY + s.h - 100

      resizeCard(card.id, newW, newH)
      moveCard(card.id, newX, newY)
    }
    const onUp = () => {
      resizeStart.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [card.id, card.width, card.height, card.x, card.y, zoom, resizeCard, moveCard])

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedCardId(card.id)
    bringToFront(card.id)
  }, [card.id, setSelectedCardId, bringToFront])

  const renderContent = () => {
    switch (card.type) {
      case 'text': return <TextCard card={card} />
      case 'ai': return <AiCard card={card} />
      case 'website': return <WebsiteCard card={card} />
      case 'link': return <GridLinkCard card={card} />
    }
  }

  return (
    <div
      className={`absolute group transition-shadow duration-200 ${isDragging ? 'opacity-90' : ''}`}
      style={{
        left: card.x,
        top: card.y,
        width: card.width,
        height: card.height,
        zIndex: card.zIndex,
      }}
      onClick={handleCardClick}
    >
      <div
        className={`w-full h-full flex flex-col rounded-xl overflow-hidden border transition-all duration-200 ${
          isSelected
            ? 'border-[var(--brand)] shadow-lg shadow-[var(--brand)]/10'
            : 'border-[var(--border)] shadow-md shadow-black/20 hover:border-[var(--text-disabled)]'
        }`}
        style={{ backgroundColor: 'var(--bg-elevated)' }}
      >
        {/* Title bar */}
        <div
          className="flex items-center gap-2 h-8 px-2.5 shrink-0 border-b border-[var(--border)] bg-[var(--bg-subtle)] select-none"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleTitleMouseDown}
        >
          <Icon icon={CARD_ICONS[card.type]} width={13} height={13} className="text-[var(--text-disabled)] shrink-0" />
          <span className="text-[11px] font-medium text-[var(--text-secondary)] truncate flex-1">{card.title || 'Untitled'}</span>
          <button
            onClick={(e) => { e.stopPropagation(); removeCard(card.id) }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--bg)] text-[var(--text-disabled)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
          >
            <Icon icon="lucide:x" width={12} height={12} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-auto">
          {renderContent()}
        </div>
      </div>

      {/* Resize handles */}
      {(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as ResizeDir[]).map(dir => (
        <div
          key={dir}
          className="absolute opacity-0"
          style={{
            cursor: RESIZE_CURSORS[dir],
            ...(dir === 'n' ? { top: -3, left: 6, right: 6, height: 6 } : {}),
            ...(dir === 's' ? { bottom: -3, left: 6, right: 6, height: 6 } : {}),
            ...(dir === 'e' ? { right: -3, top: 6, bottom: 6, width: 6 } : {}),
            ...(dir === 'w' ? { left: -3, top: 6, bottom: 6, width: 6 } : {}),
            ...(dir === 'ne' ? { top: -3, right: -3, width: 10, height: 10 } : {}),
            ...(dir === 'nw' ? { top: -3, left: -3, width: 10, height: 10 } : {}),
            ...(dir === 'se' ? { bottom: -3, right: -3, width: 10, height: 10 } : {}),
            ...(dir === 'sw' ? { bottom: -3, left: -3, width: 10, height: 10 } : {}),
          }}
          onMouseDown={handleResizeMouseDown(dir)}
        />
      ))}
    </div>
  )
}
