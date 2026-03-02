'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { usePreview } from '@/context/preview-context'

/**
 * PiP Window — floating, draggable, resizable preview that stays on top.
 * Can be moved anywhere in the editor, resized from edges, and snapped to corners.
 */
export function PipWindow() {
  const { previewUrl, pip, setPip, setVisible, refreshKey, refresh } = usePreview()

  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState({ w: 400, h: 280 })
  const [snapped, setSnapped] = useState<'br' | 'bl' | 'tr' | 'tl' | null>('br')
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 })

  // Calculate snapped position
  useEffect(() => {
    if (!snapped) return
    const pad = 16
    const x = snapped.includes('r') ? window.innerWidth - size.w - pad : pad
    const y = snapped.includes('b') ? window.innerHeight - size.h - pad - 28 : pad + 44
    setPosition({ x, y })
  }, [snapped, size])

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setSnapped(null)
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: position.x, startPosY: position.y }

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragRef.current.startX
      const dy = ev.clientY - dragRef.current.startY
      setPosition({ x: dragRef.current.startPosX + dx, y: dragRef.current.startPosY + dy })
    }
    const onUp = (ev: MouseEvent) => {
      setIsDragging(false)
      // Snap to nearest corner if close to edge
      const cx = dragRef.current.startPosX + (ev.clientX - dragRef.current.startX) + size.w / 2
      const cy = dragRef.current.startPosY + (ev.clientY - dragRef.current.startY) + size.h / 2
      const midX = window.innerWidth / 2
      const midY = window.innerHeight / 2
      const corner = `${cy < midY ? 't' : 'b'}${cx < midX ? 'l' : 'r'}` as 'tl' | 'tr' | 'bl' | 'br'
      setSnapped(corner)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [position, size])

  const exitPip = useCallback(() => {
    setPip(false)
    setVisible(true)
  }, [setPip, setVisible])

  if (!pip) return null

  return (
    <div
      ref={containerRef}
      className={`fixed z-[60] rounded-xl overflow-hidden border border-[var(--border-hover)] shadow-2xl transition-shadow ${
        isDragging ? 'shadow-[0_20px_60px_rgba(0,0,0,0.5)] cursor-grabbing' : 'shadow-[0_8px_30px_rgba(0,0,0,0.3)]'
      }`}
      style={{
        left: position.x,
        top: position.y,
        width: size.w,
        height: size.h,
        transition: snapped && !isDragging ? 'left 0.3s cubic-bezier(0.16,1,0.3,1), top 0.3s cubic-bezier(0.16,1,0.3,1)' : 'none',
      }}
    >
      {/* PiP header — drag handle */}
      <div
        onMouseDown={startDrag}
        className="flex items-center justify-between h-7 px-2 bg-[var(--bg-elevated)] border-b border-[var(--border)] cursor-grab active:cursor-grabbing shrink-0"
      >
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-[#ff5f57] cursor-pointer" onClick={() => setPip(false)} title="Close" />
            <div className="w-2 h-2 rounded-full bg-[#ffbd2e] cursor-pointer" onClick={() => setSnapped(snapped === 'br' ? 'tl' : 'br')} title="Move" />
            <div className="w-2 h-2 rounded-full bg-[#28c840] cursor-pointer" onClick={exitPip} title="Expand" />
          </div>
          <span className="text-[9px] text-[var(--text-disabled)] ml-1 select-none">Preview</span>
        </div>
        <div className="flex items-center gap-0.5">
          {/* Snap corners */}
          {(['tl', 'tr', 'bl', 'br'] as const).map(corner => (
            <button
              key={corner}
              onClick={() => setSnapped(corner)}
              className={`w-3 h-3 rounded-sm transition-colors cursor-pointer ${
                snapped === corner ? 'bg-[var(--brand)]' : 'bg-[var(--bg-subtle)] hover:bg-[var(--bg-tertiary)]'
              }`}
              title={`Snap ${corner}`}
            />
          ))}
          <button onClick={refresh} className="p-0.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-disabled)] cursor-pointer ml-1">
            <Icon icon="lucide:rotate-cw" width={10} height={10} />
          </button>
        </div>
      </div>

      {/* Preview iframe */}
      <iframe
        key={refreshKey}
        src={previewUrl}
        className="w-full border-0 bg-white"
        style={{ height: size.h - 28 }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        title="PiP Preview"
      />

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
        onMouseDown={e => {
          e.preventDefault()
          e.stopPropagation()
          const startX = e.clientX
          const startY = e.clientY
          const startW = size.w
          const startH = size.h
          setSnapped(null)

          const onMove = (ev: MouseEvent) => {
            setSize({
              w: Math.max(280, startW + (ev.clientX - startX)),
              h: Math.max(200, startH + (ev.clientY - startY)),
            })
          }
          const onUp = () => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
          }
          document.addEventListener('mousemove', onMove)
          document.addEventListener('mouseup', onUp)
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" className="text-[var(--text-disabled)] opacity-40">
          <path d="M14 14L8 14M14 14L14 8M14 14L5 5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
    </div>
  )
}
