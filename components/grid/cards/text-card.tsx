'use client'

import { useCallback, useRef, useEffect } from 'react'
import { useGrid, type GridCard } from '@/context/grid-context'

interface Props {
  card: GridCard
}

export function TextCard({ card }: Props) {
  const { updateCard } = useGrid()
  const editorRef = useRef<HTMLDivElement>(null)
  const isInitRef = useRef(false)

  useEffect(() => {
    if (editorRef.current && !isInitRef.current) {
      editorRef.current.innerText = card.content || ''
      isInitRef.current = true
    }
  }, [card.content])

  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    updateCard(card.id, { content: editorRef.current.innerText })
  }, [card.id, updateCard])

  const handleTitleChange = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const newTitle = e.target.value.trim()
    if (newTitle && newTitle !== card.title) {
      updateCard(card.id, { title: newTitle })
    }
  }, [card.id, card.title, updateCard])

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-1.5 border-b border-[var(--border)]">
        <input
          defaultValue={card.title || 'Note'}
          onBlur={handleTitleChange}
          className="w-full text-xs font-semibold text-[var(--text-primary)] bg-transparent border-none outline-none"
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
        />
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="flex-1 p-3 text-[13px] leading-relaxed text-[var(--text-secondary)] outline-none overflow-auto whitespace-pre-wrap break-words"
        data-placeholder="Start typing..."
        style={{ minHeight: 0 }}
      />
    </div>
  )
}
