'use client'

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'

export interface GridCard {
  id: string
  type: 'text' | 'ai' | 'website' | 'link'
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  title?: string
  content?: string
  aiProvider?: string
  aiMessages?: AiMessage[]
  url?: string
  targetGridId?: string
}

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface Grid {
  id: string
  name: string
  cards: GridCard[]
  viewportX: number
  viewportY: number
  zoom: number
  createdAt: number
  updatedAt: number
}

interface GridContextValue {
  grids: Grid[]
  activeGridId: string | null
  activeGrid: Grid | null
  createGrid: (name?: string) => string
  deleteGrid: (id: string) => void
  renameGrid: (id: string, name: string) => void
  switchGrid: (id: string) => void
  addCard: (type: GridCard['type'], x?: number, y?: number) => string
  updateCard: (cardId: string, updates: Partial<GridCard>) => void
  removeCard: (cardId: string) => void
  moveCard: (cardId: string, x: number, y: number) => void
  resizeCard: (cardId: string, width: number, height: number) => void
  bringToFront: (cardId: string) => void
  updateViewport: (x: number, y: number, zoom: number) => void
  selectedCardId: string | null
  setSelectedCardId: (id: string | null) => void
}

const GridContext = createContext<GridContextValue | null>(null)

const STORAGE_KEY = 'code-editor:grids'

function makeId(): string {
  return crypto.randomUUID()
}

function createDefaultGrid(name = 'Main Grid'): Grid {
  return {
    id: makeId(),
    name,
    cards: [],
    viewportX: 0,
    viewportY: 0,
    zoom: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

const DEFAULT_CARD_SIZES: Record<GridCard['type'], { width: number; height: number }> = {
  text: { width: 300, height: 200 },
  ai: { width: 380, height: 420 },
  website: { width: 450, height: 350 },
  link: { width: 240, height: 140 },
}

export function GridProvider({ children }: { children: ReactNode }) {
  const [grids, setGrids] = useState<Grid[]>([])
  const [activeGridId, setActiveGridId] = useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gridsRef = useRef(grids)
  gridsRef.current = grids

  const activeGrid = useMemo(() => grids.find(g => g.id === activeGridId) ?? null, [grids, activeGridId])

  useEffect(() => {
    let data: Grid[] | null = null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) data = JSON.parse(raw)
    } catch {}

    if (data && data.length > 0) {
      setGrids(data)
      setActiveGridId(data[0].id)
    } else {
      const initial = createDefaultGrid()
      setGrids([initial])
      setActiveGridId(initial.id)
    }
  }, [])

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(gridsRef.current)) } catch {}
    }, 500)
  }, [])

  const mutateGrids = useCallback((fn: (prev: Grid[]) => Grid[]) => {
    setGrids(prev => {
      const next = fn(prev)
      return next
    })
    scheduleSave()
  }, [scheduleSave])

  const mutateActiveGrid = useCallback((fn: (grid: Grid) => Grid) => {
    mutateGrids(prev => prev.map(g => g.id === activeGridId ? fn({ ...g, updatedAt: Date.now() }) : g))
  }, [mutateGrids, activeGridId])

  const createGrid = useCallback((name?: string) => {
    const grid = createDefaultGrid(name || `Grid ${gridsRef.current.length + 1}`)
    mutateGrids(prev => [...prev, grid])
    setActiveGridId(grid.id)
    return grid.id
  }, [mutateGrids])

  const deleteGrid = useCallback((id: string) => {
    setGrids(prev => {
      let next = prev.filter(g => g.id !== id)
      if (next.length === 0) {
        next = [createDefaultGrid()]
      }
      if (activeGridId === id) {
        setActiveGridId(next[0].id)
      }
      return next
    })
    scheduleSave()
  }, [activeGridId, scheduleSave])

  const renameGrid = useCallback((id: string, name: string) => {
    mutateGrids(prev => prev.map(g => g.id === id ? { ...g, name, updatedAt: Date.now() } : g))
  }, [mutateGrids])

  const switchGrid = useCallback((id: string) => {
    setActiveGridId(id)
    setSelectedCardId(null)
  }, [])

  const addCard = useCallback((type: GridCard['type'], x?: number, y?: number) => {
    const id = makeId()
    const size = DEFAULT_CARD_SIZES[type]
    const grid = gridsRef.current.find(g => g.id === activeGridId)
    const maxZ = grid?.cards.reduce((max, c) => Math.max(max, c.zIndex), 0) ?? 0
    const centerX = x ?? (grid ? (-grid.viewportX + 400) / grid.zoom : 200)
    const centerY = y ?? (grid ? (-grid.viewportY + 300) / grid.zoom : 200)

    const card: GridCard = {
      id,
      type,
      x: centerX,
      y: centerY,
      width: size.width,
      height: size.height,
      zIndex: maxZ + 1,
      title: type === 'text' ? 'Note' : type === 'ai' ? 'AI Chat' : type === 'website' ? 'Website' : 'Grid Link',
    }
    mutateActiveGrid(g => ({ ...g, cards: [...g.cards, card] }))
    setSelectedCardId(id)
    return id
  }, [mutateActiveGrid, activeGridId])

  const updateCard = useCallback((cardId: string, updates: Partial<GridCard>) => {
    mutateActiveGrid(g => ({
      ...g,
      cards: g.cards.map(c => c.id === cardId ? { ...c, ...updates } : c),
    }))
  }, [mutateActiveGrid])

  const removeCard = useCallback((cardId: string) => {
    mutateActiveGrid(g => ({ ...g, cards: g.cards.filter(c => c.id !== cardId) }))
    if (selectedCardId === cardId) setSelectedCardId(null)
  }, [mutateActiveGrid, selectedCardId])

  const moveCard = useCallback((cardId: string, x: number, y: number) => {
    mutateActiveGrid(g => ({
      ...g,
      cards: g.cards.map(c => c.id === cardId ? { ...c, x, y } : c),
    }))
  }, [mutateActiveGrid])

  const resizeCard = useCallback((cardId: string, width: number, height: number) => {
    mutateActiveGrid(g => ({
      ...g,
      cards: g.cards.map(c => c.id === cardId ? { ...c, width: Math.max(150, width), height: Math.max(100, height) } : c),
    }))
  }, [mutateActiveGrid])

  const bringToFront = useCallback((cardId: string) => {
    mutateActiveGrid(g => {
      const maxZ = g.cards.reduce((max, c) => Math.max(max, c.zIndex), 0)
      return {
        ...g,
        cards: g.cards.map(c => c.id === cardId ? { ...c, zIndex: maxZ + 1 } : c),
      }
    })
  }, [mutateActiveGrid])

  const updateViewport = useCallback((x: number, y: number, zoom: number) => {
    mutateActiveGrid(g => ({ ...g, viewportX: x, viewportY: y, zoom }))
  }, [mutateActiveGrid])

  const value = useMemo<GridContextValue>(() => ({
    grids, activeGridId, activeGrid,
    createGrid, deleteGrid, renameGrid, switchGrid,
    addCard, updateCard, removeCard, moveCard, resizeCard, bringToFront,
    updateViewport, selectedCardId, setSelectedCardId,
  }), [grids, activeGridId, activeGrid,
    createGrid, deleteGrid, renameGrid, switchGrid,
    addCard, updateCard, removeCard, moveCard, resizeCard, bringToFront,
    updateViewport, selectedCardId, setSelectedCardId])

  return (
    <GridContext.Provider value={value}>
      {children}
    </GridContext.Provider>
  )
}

export function useGrid() {
  const ctx = useContext(GridContext)
  if (!ctx) throw new Error('useGrid must be used within GridProvider')
  return ctx
}
