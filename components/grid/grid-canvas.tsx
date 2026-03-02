'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useGrid } from '@/context/grid-context'
import { CardWrapper } from './card-wrapper'

export function GridCanvas() {
  const { activeGrid, updateViewport, addCard, setSelectedCardId, selectedCardId, removeCard } = useGrid()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const panStart = useRef<{ x: number; y: number; vpX: number; vpY: number } | null>(null)

  const vpX = activeGrid?.viewportX ?? 0
  const vpY = activeGrid?.viewportY ?? 0
  const zoom = activeGrid?.zoom ?? 1

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const isEditable = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable
      if (e.code === 'Space' && !e.repeat && !isEditable) {
        e.preventDefault()
        setSpaceHeld(true)
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCardId && !isEditable) {
        e.preventDefault()
        removeCard(selectedCardId)
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [selectedCardId, removeCard])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle-click or space+left-click for panning
    if (e.button === 1 || (e.button === 0 && spaceHeld)) {
      e.preventDefault()
      setIsPanning(true)
      panStart.current = { x: e.clientX, y: e.clientY, vpX, vpY }
      return
    }
    if (e.button === 0 && e.target === e.currentTarget) {
      setSelectedCardId(null)
    }
  }, [spaceHeld, vpX, vpY, setSelectedCardId])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !panStart.current) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    updateViewport(panStart.current.vpX + dx, panStart.current.vpY + dy, zoom)
  }, [isPanning, zoom, updateViewport])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    panStart.current = null
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.min(3, Math.max(0.15, zoom * delta))
      const ratio = newZoom / zoom

      const newVpX = mouseX - (mouseX - vpX) * ratio
      const newVpY = mouseY - (mouseY - vpY) * ratio

      updateViewport(newVpX, newVpY, newZoom)
    } else {
      updateViewport(vpX - e.deltaX, vpY - e.deltaY, zoom)
    }
  }, [zoom, vpX, vpY, updateViewport])

  // Double-click to add text card
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX - rect.left - vpX) / zoom
    const y = (e.clientY - rect.top - vpY) / zoom
    addCard('text', x, y)
  }, [vpX, vpY, zoom, addCard])

  const dotSize = Math.max(0.5, 1 * zoom)
  const gridSpacing = 24 * zoom
  const bgOffsetX = vpX % gridSpacing
  const bgOffsetY = vpY % gridSpacing

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        cursor: isPanning ? 'grabbing' : spaceHeld ? 'grab' : 'default',
        backgroundImage: `radial-gradient(circle, var(--text-disabled) ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${gridSpacing}px ${gridSpacing}px`,
        backgroundPosition: `${bgOffsetX}px ${bgOffsetY}px`,
        backgroundColor: 'var(--bg)',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
    >
      <div
        style={{
          transform: `translate(${vpX}px, ${vpY}px) scale(${zoom})`,
          transformOrigin: '0 0',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {activeGrid?.cards.map(card => (
          <CardWrapper key={card.id} card={card} zoom={zoom} />
        ))}
      </div>
    </div>
  )
}
