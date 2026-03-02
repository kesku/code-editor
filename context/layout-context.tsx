'use client'

import { createContext, useContext, useReducer, useCallback, useEffect, useMemo, useRef, type ReactNode, type Dispatch } from 'react'

// ─── Panel Definitions ──────────────────────────────────
// Add a new panel here → it automatically gets toggle, resize, persistence, presets

export type PanelId = 'sidebar' | 'tree' | 'chat' | 'engine' | 'terminal'

export type PanelAxis = 'horizontal' | 'vertical'

interface PanelDef {
  /** localStorage key suffix */
  key: string
  /** Default visibility */
  defaultVisible: boolean
  /** Default size (width or height depending on axis) */
  defaultSize: number
  /** Min size for resize clamping */
  minSize: number
  /** Max size for resize clamping */
  maxSize: number
  /** Resize axis */
  axis: PanelAxis
  /** Whether the panel can be resized */
  resizable: boolean
}

export const PANEL_DEFS: Record<PanelId, PanelDef> = {
  sidebar: { key: 'sidebar-collapsed', defaultVisible: true, defaultSize: 0, minSize: 0, maxSize: 0, axis: 'horizontal', resizable: false },
  tree:    { key: 'tree',    defaultVisible: false, defaultSize: 220, minSize: 160, maxSize: 400, axis: 'horizontal', resizable: true },
  chat:    { key: 'chat',    defaultVisible: true,  defaultSize: 360, minSize: 280, maxSize: 600, axis: 'horizontal', resizable: true },
  engine:  { key: 'engine',  defaultVisible: false, defaultSize: 240, minSize: 120, maxSize: 500, axis: 'vertical',   resizable: true },
  terminal:{ key: 'terminal',defaultVisible: false, defaultSize: 240, minSize: 100, maxSize: 500, axis: 'vertical',   resizable: true },
}

const PANEL_IDS = Object.keys(PANEL_DEFS) as PanelId[]

// ─── State Shape ────────────────────────────────────────

interface PanelState {
  visible: boolean
  size: number
}

export interface LayoutState {
  panels: Record<PanelId, PanelState>
  /** Editor area collapsed (no files open / intentionally collapsed) */
  editorCollapsed: boolean
}

// ─── Actions ────────────────────────────────────────────

type LayoutAction =
  | { type: 'TOGGLE'; panel: PanelId }
  | { type: 'SHOW'; panel: PanelId }
  | { type: 'HIDE'; panel: PanelId }
  | { type: 'SET_VISIBLE'; panel: PanelId; visible: boolean }
  | { type: 'RESIZE'; panel: PanelId; size: number }
  | { type: 'SET_EDITOR_COLLAPSED'; collapsed: boolean }
  | { type: 'PRESET'; preset: LayoutPreset }
  | { type: 'HYDRATE'; state: Partial<LayoutState> }
  | { type: 'BATCH'; actions: LayoutAction[] }

export type LayoutPreset = 'focus' | 'review' | 'build' | 'default'

// ─── Presets ────────────────────────────────────────────

const PRESETS: Record<LayoutPreset, Partial<Record<PanelId, boolean>> & { editorCollapsed?: boolean }> = {
  focus:   { tree: false, engine: false, chat: false, terminal: false, editorCollapsed: false },
  review:  { tree: true,  engine: false, chat: true,  terminal: false, editorCollapsed: false },
  build:   { tree: false, engine: true,  chat: false, terminal: true,  editorCollapsed: false },
  default: { tree: false, engine: false, chat: true,  terminal: false, editorCollapsed: false },
}

// ─── Reducer ────────────────────────────────────────────

function clampSize(panel: PanelId, size: number): number {
  const def = PANEL_DEFS[panel]
  if (!def.resizable) return def.defaultSize
  return Math.max(def.minSize, Math.min(def.maxSize, size))
}

function layoutReducer(state: LayoutState, action: LayoutAction): LayoutState {
  switch (action.type) {
    case 'TOGGLE': {
      const panel = state.panels[action.panel]
      // Sidebar is inverted: "collapsed" = not visible
      return {
        ...state,
        panels: { ...state.panels, [action.panel]: { ...panel, visible: !panel.visible } },
      }
    }
    case 'SHOW':
      if (state.panels[action.panel].visible) return state
      return {
        ...state,
        panels: { ...state.panels, [action.panel]: { ...state.panels[action.panel], visible: true } },
      }
    case 'HIDE':
      if (!state.panels[action.panel].visible) return state
      return {
        ...state,
        panels: { ...state.panels, [action.panel]: { ...state.panels[action.panel], visible: false } },
      }
    case 'SET_VISIBLE':
      if (state.panels[action.panel].visible === action.visible) return state
      return {
        ...state,
        panels: { ...state.panels, [action.panel]: { ...state.panels[action.panel], visible: action.visible } },
      }
    case 'RESIZE': {
      const clamped = clampSize(action.panel, action.size)
      return {
        ...state,
        panels: { ...state.panels, [action.panel]: { ...state.panels[action.panel], size: clamped } },
      }
    }
    case 'SET_EDITOR_COLLAPSED':
      if (state.editorCollapsed === action.collapsed) return state
      return { ...state, editorCollapsed: action.collapsed }
    case 'PRESET': {
      const preset = PRESETS[action.preset]
      const panels = { ...state.panels }
      for (const [id, vis] of Object.entries(preset)) {
        if (id === 'editorCollapsed') continue
        if (id in panels) {
          panels[id as PanelId] = { ...panels[id as PanelId], visible: vis as boolean }
        }
      }
      return {
        ...state,
        panels,
        editorCollapsed: preset.editorCollapsed ?? state.editorCollapsed,
      }
    }
    case 'HYDRATE': {
      if (!action.state.panels) return state
      const panels = { ...state.panels }
      for (const [id, ps] of Object.entries(action.state.panels)) {
        if (id in panels) {
          panels[id as PanelId] = { ...panels[id as PanelId], ...ps }
        }
      }
      return {
        ...state,
        panels,
        editorCollapsed: action.state.editorCollapsed ?? state.editorCollapsed,
      }
    }
    case 'BATCH': {
      return action.actions.reduce(layoutReducer, state)
    }
    default:
      return state
  }
}

// ─── Initial State ──────────────────────────────────────

function buildInitialState(): LayoutState {
  const panels = {} as Record<PanelId, PanelState>
  for (const id of PANEL_IDS) {
    const def = PANEL_DEFS[id]
    panels[id] = { visible: def.defaultVisible, size: def.defaultSize }
  }
  return { panels, editorCollapsed: true }
}

// ─── Persistence ────────────────────────────────────────

const STORAGE_PREFIX = 'ce:'

function hydrateFromStorage(): Partial<LayoutState> {
  const panels: Partial<Record<PanelId, Partial<PanelState>>> = {}

  for (const id of PANEL_IDS) {
    const def = PANEL_DEFS[id]
    try {
      // Sidebar uses inverted key (sidebar-collapsed)
      if (id === 'sidebar') {
        const raw = localStorage.getItem('code-editor:sidebar-collapsed')
        if (raw !== null) panels[id] = { visible: raw !== 'true' }
      } else {
        const visKey = `${STORAGE_PREFIX}${def.key}-visible`
        const sizeKey = `${STORAGE_PREFIX}${def.key}-w`
        const vis = localStorage.getItem(visKey)
        const size = localStorage.getItem(sizeKey)
        const ps: Partial<PanelState> = {}
        if (vis !== null) ps.visible = vis === 'true'
        if (size !== null) {
          const n = parseInt(size)
          if (!isNaN(n)) ps.size = clampSize(id, n)
        }
        if (Object.keys(ps).length > 0) panels[id] = ps
      }
    } catch {}
  }

  let editorCollapsed: boolean | undefined
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}editor-collapsed`)
    if (raw !== null) editorCollapsed = raw === 'true'
  } catch {}

  // Also check legacy keys
  try {
    const legacyTermVis = localStorage.getItem('code-editor:terminal-visible')
    if (legacyTermVis !== null && !panels.terminal) panels.terminal = { visible: legacyTermVis === 'true' }
  } catch {}
  try {
    const legacyTermH = localStorage.getItem('code-editor:terminal-height')
    if (legacyTermH !== null) {
      const n = parseInt(legacyTermH)
      if (!isNaN(n)) panels.terminal = { ...panels.terminal, size: clampSize('terminal', n) }
    }
  } catch {}

  return { panels: panels as Record<PanelId, PanelState>, editorCollapsed }
}

function persistToStorage(state: LayoutState) {
  try {
    for (const id of PANEL_IDS) {
      const def = PANEL_DEFS[id]
      const ps = state.panels[id]
      if (id === 'sidebar') {
        localStorage.setItem('code-editor:sidebar-collapsed', String(!ps.visible))
      } else {
        localStorage.setItem(`${STORAGE_PREFIX}${def.key}-visible`, String(ps.visible))
        if (def.resizable) {
          localStorage.setItem(`${STORAGE_PREFIX}${def.key}-w`, String(ps.size))
        }
      }
    }
    localStorage.setItem(`${STORAGE_PREFIX}editor-collapsed`, String(state.editorCollapsed))
    // Also persist legacy keys for backward compat
    localStorage.setItem('code-editor:terminal-visible', String(state.panels.terminal.visible))
    localStorage.setItem('code-editor:terminal-height', String(state.panels.terminal.size))
  } catch {}
}

// ─── Context & Hook ─────────────────────────────────────

interface LayoutContextValue {
  state: LayoutState
  dispatch: Dispatch<LayoutAction>
  /** Toggle panel visibility */
  toggle: (panel: PanelId) => void
  /** Show a panel */
  show: (panel: PanelId) => void
  /** Hide a panel */
  hide: (panel: PanelId) => void
  /** Resize a panel (auto-clamps) */
  resize: (panel: PanelId, size: number) => void
  /** Apply a layout preset */
  preset: (p: LayoutPreset) => void
  /** Get panel state */
  panel: (id: PanelId) => PanelState
  /** Get panel definition */
  panelDef: (id: PanelId) => PanelDef
  /** Is panel visible? */
  isVisible: (id: PanelId) => boolean
  /** Get panel size */
  getSize: (id: PanelId) => number
  /** Collapse/expand the editor */
  setEditorCollapsed: (collapsed: boolean) => void
  /** Is editor collapsed? */
  editorCollapsed: boolean
}

const LayoutContext = createContext<LayoutContextValue | null>(null)

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(layoutReducer, undefined, buildInitialState)
  const hydrated = useRef(false)

  // Hydrate from localStorage after mount
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    const stored = hydrateFromStorage()
    dispatch({ type: 'HYDRATE', state: stored })
  }, [])

  // Persist on every state change (after hydration)
  const stateRef = useRef(state)
  stateRef.current = state
  useEffect(() => {
    if (!hydrated.current) return
    persistToStorage(state)
  }, [state])

  // ─── Convenience methods ───
  const toggle = useCallback((panel: PanelId) => dispatch({ type: 'TOGGLE', panel }), [])
  const show = useCallback((panel: PanelId) => dispatch({ type: 'SHOW', panel }), [])
  const hide = useCallback((panel: PanelId) => dispatch({ type: 'HIDE', panel }), [])
  const resize = useCallback((panel: PanelId, size: number) => dispatch({ type: 'RESIZE', panel, size }), [])
  const preset = useCallback((p: LayoutPreset) => dispatch({ type: 'PRESET', preset: p }), [])
  const setEditorCollapsed = useCallback((collapsed: boolean) => dispatch({ type: 'SET_EDITOR_COLLAPSED', collapsed }), [])

  const panel = useCallback((id: PanelId) => state.panels[id], [state.panels])
  const panelDef = useCallback((id: PanelId) => PANEL_DEFS[id], [])
  const isVisible = useCallback((id: PanelId) => state.panels[id].visible, [state.panels])
  const getSize = useCallback((id: PanelId) => state.panels[id].size, [state.panels])

  // ─── Window event bridge (backward compat) ───
  useEffect(() => {
    const handlers: [string, () => void][] = [
      ['cmd:toggle-files', () => toggle('tree')],
      ['cmd:toggle-engine', () => toggle('engine')],
      ['cmd:toggle-chat', () => toggle('chat')],
      ['cmd:collapse-editor', () => setEditorCollapsed(true)],
      ['toggle-terminal', () => toggle('terminal')],
      ['show-terminal', () => show('terminal')],
      ['hide-terminal', () => hide('terminal')],
      ['open-side-chat', () => show('chat')],
      ['cmd:layout-preset', (e?: Event) => {
        const p = (e as CustomEvent)?.detail as LayoutPreset
        if (p && p in PRESETS) preset(p)
      }],
    ]
    // Need to handle the event parameter for preset
    const wrappedHandlers = handlers.map(([event, fn]) => {
      const handler = (e: Event) => (fn as (e?: Event) => void)(e)
      window.addEventListener(event, handler)
      return [event, handler] as const
    })
    return () => {
      for (const [event, handler] of wrappedHandlers) {
        window.removeEventListener(event, handler)
      }
    }
  }, [toggle, show, hide, preset, setEditorCollapsed])

  const value = useMemo<LayoutContextValue>(() => ({
    state, dispatch, toggle, show, hide, resize, preset,
    panel, panelDef, isVisible, getSize,
    setEditorCollapsed, editorCollapsed: state.editorCollapsed,
  }), [state, toggle, show, hide, resize, preset, panel, panelDef, isVisible, getSize, setEditorCollapsed])

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  )
}

export function useLayout() {
  const ctx = useContext(LayoutContext)
  if (!ctx) throw new Error('useLayout must be used within LayoutProvider')
  return ctx
}

// ─── Resize Hook ────────────────────────────────────────
// Drag-to-resize for any panel, handles mouse events

export function usePanelResize(panel: PanelId) {
  const { resize, getSize, panelDef } = useLayout()
  const def = panelDef(panel)

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startPos = def.axis === 'horizontal' ? e.clientX : e.clientY
    const startSize = getSize(panel)

    const onMove = (ev: MouseEvent) => {
      const currentPos = def.axis === 'horizontal' ? ev.clientX : ev.clientY
      // For right-side panels (chat), invert the delta
      const delta = panel === 'chat'
        ? startPos - currentPos
        : panel === 'terminal'
          ? startPos - currentPos
          : currentPos - startPos
      resize(panel, startSize + delta)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [panel, def.axis, getSize, resize])

  return { onResizeStart }
}
