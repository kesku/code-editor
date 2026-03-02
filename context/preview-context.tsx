'use client'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'

export type DeviceFrame = 'responsive' | 'iphone-15' | 'pixel-8' | 'ipad-air' | 'macbook-14' | 'desktop-1080'

export interface DeviceSpec {
  id: DeviceFrame
  label: string
  width: number
  height: number
  scale: number
  bezel: boolean
  icon: string
}

export const DEVICES: DeviceSpec[] = [
  { id: 'responsive', label: 'Responsive', width: 0, height: 0, scale: 1, bezel: false, icon: 'lucide:maximize' },
  { id: 'iphone-15', label: 'iPhone 15', width: 393, height: 852, scale: 0.7, bezel: true, icon: 'lucide:smartphone' },
  { id: 'pixel-8', label: 'Pixel 8', width: 412, height: 915, scale: 0.7, bezel: true, icon: 'lucide:smartphone' },
  { id: 'ipad-air', label: 'iPad Air', width: 820, height: 1180, scale: 0.5, bezel: true, icon: 'lucide:tablet' },
  { id: 'macbook-14', label: 'MacBook 14"', width: 1512, height: 982, scale: 0.45, bezel: true, icon: 'lucide:laptop' },
  { id: 'desktop-1080', label: '1080p', width: 1920, height: 1080, scale: 0.4, bezel: false, icon: 'lucide:monitor' },
]

export interface AgentAnnotation {
  id: string
  selector: string
  label: string
  type: 'added' | 'modified' | 'removed'
  filePath: string
  line?: number
  timestamp: number
}

export interface IsolatedComponent {
  name: string
  filePath: string
  props: Record<string, unknown>
  code?: string
}

interface PreviewContextValue {
  previewUrl: string
  setPreviewUrl: (url: string) => void
  visible: boolean
  setVisible: (v: boolean) => void
  pip: boolean
  setPip: (v: boolean) => void
  activeDevice: DeviceFrame
  setActiveDevice: (d: DeviceFrame) => void
  carouselMode: boolean
  setCarouselMode: (v: boolean) => void
  annotations: AgentAnnotation[]
  addAnnotation: (a: Omit<AgentAnnotation, 'id' | 'timestamp'>) => void
  clearAnnotations: () => void
  isolatedComponent: IsolatedComponent | null
  isolateComponent: (comp: IsolatedComponent) => void
  exitIsolation: () => void
  refreshKey: number
  refresh: () => void
}

const PreviewContext = createContext<PreviewContextValue | null>(null)

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [previewUrl, setPreviewUrl] = useState('http://localhost:3000')
  const [visible, setVisible] = useState(false)
  const [pip, setPip] = useState(false)
  const [activeDevice, setActiveDevice] = useState<DeviceFrame>('responsive')
  const [carouselMode, setCarouselMode] = useState(false)
  const [annotations, setAnnotations] = useState<AgentAnnotation[]>([])
  const [isolatedComponent, setIsolatedComponent] = useState<IsolatedComponent | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const addAnnotation = useCallback((a: Omit<AgentAnnotation, 'id' | 'timestamp'>) => {
    setAnnotations(prev => [...prev, { ...a, id: crypto.randomUUID(), timestamp: Date.now() }])
  }, [])
  const clearAnnotations = useCallback(() => setAnnotations([]), [])
  const isolateComponent = useCallback((comp: IsolatedComponent) => {
    setIsolatedComponent(comp)
    setVisible(true)
  }, [])
  const exitIsolation = useCallback(() => setIsolatedComponent(null), [])
  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  const value = useMemo<PreviewContextValue>(() => ({
    previewUrl, setPreviewUrl, visible, setVisible, pip, setPip,
    activeDevice, setActiveDevice, carouselMode, setCarouselMode,
    annotations, addAnnotation, clearAnnotations,
    isolatedComponent, isolateComponent, exitIsolation,
    refreshKey, refresh,
  }), [
    previewUrl, visible, pip, activeDevice, carouselMode,
    annotations, addAnnotation, clearAnnotations,
    isolatedComponent, isolateComponent, exitIsolation,
    refreshKey, refresh,
  ])

  return (
    <PreviewContext.Provider value={value}>
      {children}
    </PreviewContext.Provider>
  )
}

export function usePreview() {
  const ctx = useContext(PreviewContext)
  if (!ctx) throw new Error('usePreview must be used within PreviewProvider')
  return ctx
}
