'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { usePreview, DEVICES, type DeviceSpec } from '@/context/preview-context'
import { useEditor } from '@/context/editor-context'
import { DeviceCarousel } from './device-carousel'
import { PipWindow } from './pip-window'
import { AgentAnnotationOverlay } from './agent-annotations'
import { ComponentIsolator } from './component-isolator'

export function PreviewPanel() {
  const {
    previewUrl, setPreviewUrl, visible, setVisible,
    pip, setPip, activeDevice, setActiveDevice,
    carouselMode, setCarouselMode,
    isolatedComponent, exitIsolation,
    annotations, clearAnnotations,
    refreshKey, refresh,
  } = usePreview()

  const { activeFile, files } = useEditor()
  const [urlInput, setUrlInput] = useState(previewUrl)
  const [urlEditing, setUrlEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const device = DEVICES.find(d => d.id === activeDevice) ?? DEVICES[0]

  // Sync URL input with context
  useEffect(() => { setUrlInput(previewUrl) }, [previewUrl])

  const handleUrlSubmit = () => {
    let url = urlInput.trim()
    if (url && !url.startsWith('http')) url = `http://${url}`
    setPreviewUrl(url)
    setUrlEditing(false)
  }

  const handleIframeLoad = useCallback(() => setLoading(false), [])

  // If in PiP mode, render the floating window instead
  if (pip) {
    return <PipWindow />
  }

  if (!visible) return null

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] overflow-hidden">
      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-1 h-9 px-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] shrink-0">
        {/* Navigation */}
        <button onClick={() => iframeRef.current?.contentWindow?.history.back()} className="p-1 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-disabled)] hover:text-[var(--text-secondary)] cursor-pointer" title="Back">
          <Icon icon="lucide:arrow-left" width={13} height={13} />
        </button>
        <button onClick={() => iframeRef.current?.contentWindow?.history.forward()} className="p-1 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-disabled)] hover:text-[var(--text-secondary)] cursor-pointer" title="Forward">
          <Icon icon="lucide:arrow-right" width={13} height={13} />
        </button>
        <button onClick={refresh} className="p-1 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-disabled)] hover:text-[var(--text-secondary)] cursor-pointer" title="Refresh">
          <Icon icon={loading ? 'lucide:loader-2' : 'lucide:rotate-cw'} width={13} height={13} className={loading ? 'animate-spin' : ''} />
        </button>

        {/* URL bar */}
        <div className="flex-1 mx-1">
          {urlEditing ? (
            <input
              type="text"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onBlur={handleUrlSubmit}
              onKeyDown={e => { if (e.key === 'Enter') handleUrlSubmit(); if (e.key === 'Escape') { setUrlInput(previewUrl); setUrlEditing(false) } }}
              autoFocus
              className="w-full px-2 py-0.5 text-[11px] font-mono rounded-md bg-[var(--bg)] border border-[var(--border-focus)] text-[var(--text-primary)] outline-none"
            />
          ) : (
            <button
              onClick={() => setUrlEditing(true)}
              className="w-full text-left px-2 py-0.5 text-[11px] font-mono rounded-md bg-[var(--bg)] border border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--border-hover)] transition-colors cursor-text truncate"
            >
              {isolatedComponent ? `⚛ ${isolatedComponent.name} — isolated` : previewUrl}
            </button>
          )}
        </div>

        {/* Device selector */}
        <div className="flex items-center gap-0.5 px-1 border-l border-[var(--border)] ml-1">
          {DEVICES.slice(0, 4).map(d => (
            <button
              key={d.id}
              onClick={() => { setActiveDevice(d.id); setCarouselMode(false) }}
              className={`p-1 rounded transition-colors cursor-pointer ${
                activeDevice === d.id && !carouselMode
                  ? 'bg-[color-mix(in_srgb,var(--brand)_15%,transparent)] text-[var(--brand)]'
                  : 'text-[var(--text-disabled)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
              }`}
              title={d.label}
            >
              <Icon icon={d.icon} width={13} height={13} />
            </button>
          ))}
          <button
            onClick={() => setCarouselMode(!carouselMode)}
            className={`p-1 rounded transition-colors cursor-pointer ${
              carouselMode
                ? 'bg-[color-mix(in_srgb,var(--brand)_15%,transparent)] text-[var(--brand)]'
                : 'text-[var(--text-disabled)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
            }`}
            title="Device Carousel"
          >
            <Icon icon="lucide:layout-grid" width={13} height={13} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 border-l border-[var(--border)] pl-1 ml-1">
          {/* Component Isolation */}
          {isolatedComponent ? (
            <button onClick={exitIsolation} className="p-1 rounded bg-[color-mix(in_srgb,var(--brand)_15%,transparent)] text-[var(--brand)] cursor-pointer" title="Exit component isolation">
              <Icon icon="lucide:minimize-2" width={13} height={13} />
            </button>
          ) : (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('preview-isolate-component'))}
              className="p-1 rounded text-[var(--text-disabled)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
              title="Isolate component (⌘⇧I)"
            >
              <Icon icon="lucide:component" width={13} height={13} />
            </button>
          )}

          {/* Annotations */}
          {annotations.length > 0 && (
            <button onClick={clearAnnotations} className="relative p-1 rounded text-[var(--color-ai)] hover:bg-[var(--color-ai-hover-bg)] cursor-pointer" title={`${annotations.length} agent changes`}>
              <Icon icon="lucide:sparkles" width={13} height={13} />
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--color-ai)] text-[7px] font-bold text-[var(--bg)] flex items-center justify-center">
                {annotations.length}
              </span>
            </button>
          )}

          {/* PiP */}
          <button onClick={() => setPip(true)} className="p-1 rounded text-[var(--text-disabled)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer" title="Picture-in-Picture">
            <Icon icon="lucide:picture-in-picture-2" width={13} height={13} />
          </button>

          {/* Open external */}
          <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="p-1 rounded text-[var(--text-disabled)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer">
            <Icon icon="lucide:external-link" width={13} height={13} />
          </a>

          {/* Close */}
          <button onClick={() => setVisible(false)} className="p-1 rounded text-[var(--text-disabled)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer" title="Close preview">
            <Icon icon="lucide:x" width={13} height={13} />
          </button>
        </div>
      </div>

      {/* ── Preview Area ─────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {/* Loading shimmer */}
        {loading && (
          <div className="absolute inset-0 z-10 bg-[var(--bg)] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Icon icon="lucide:loader-2" width={24} height={24} className="text-[var(--brand)] animate-spin" />
              <span className="text-[11px] text-[var(--text-tertiary)]">Loading preview…</span>
            </div>
          </div>
        )}

        {/* Component Isolation mode */}
        {isolatedComponent ? (
          <ComponentIsolator />
        ) : carouselMode ? (
          <DeviceCarousel />
        ) : (
          /* Single device preview */
          <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
            <DeviceWrapper device={device}>
              <iframe
                ref={iframeRef}
                key={refreshKey}
                src={previewUrl}
                onLoad={handleIframeLoad}
                className="w-full h-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                title="Preview"
              />
            </DeviceWrapper>
          </div>
        )}

        {/* Agent Annotations overlay */}
        {annotations.length > 0 && !isolatedComponent && (
          <AgentAnnotationOverlay iframeRef={iframeRef} />
        )}
      </div>
    </div>
  )
}

/* ── Device Frame Wrapper ────────────────────────────────────── */
export function DeviceWrapper({ device, children, className = '' }: { device: DeviceSpec; children: React.ReactNode; className?: string }) {
  if (device.id === 'responsive') {
    return <div className={`w-full h-full ${className}`}>{children}</div>
  }

  const w = device.width * device.scale
  const h = device.height * device.scale
  const isPhone = device.id.includes('iphone') || device.id.includes('pixel')
  const isTablet = device.id.includes('ipad')
  const isLaptop = device.id.includes('macbook')

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Device label */}
      <div className="text-[9px] font-medium text-[var(--text-disabled)] uppercase tracking-wider mb-2">
        {device.label} — {device.width}×{device.height}
      </div>

      {/* Device frame */}
      <div
        className={`relative bg-[var(--bg-tertiary)] overflow-hidden shadow-2xl ${
          isPhone ? 'rounded-[28px] p-2' :
          isTablet ? 'rounded-[18px] p-2.5' :
          isLaptop ? 'rounded-t-[10px] p-1.5 pb-0' :
          'rounded-lg p-1'
        }`}
        style={{ width: w + (isPhone ? 16 : isTablet ? 20 : isLaptop ? 12 : 8), height: h + (isPhone ? 16 : isTablet ? 20 : isLaptop ? 12 : 8) }}
      >
        {/* Notch (iPhone) */}
        {device.id === 'iphone-15' && (
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-[80px] h-[20px] bg-[var(--bg-tertiary)] rounded-b-2xl z-10" />
        )}

        {/* Camera (Pixel) */}
        {device.id === 'pixel-8' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-[var(--bg-secondary)] rounded-full z-10" />
        )}

        <div className="w-full h-full rounded-[inherit] overflow-hidden">
          <div style={{ width: device.width, height: device.height, transform: `scale(${device.scale})`, transformOrigin: 'top left' }}>
            {children}
          </div>
        </div>
      </div>

      {/* Laptop base */}
      {isLaptop && (
        <div
          className="bg-[var(--bg-tertiary)] rounded-b-lg shadow-2xl"
          style={{ width: w + 40, height: 10 }}
        >
          <div className="mx-auto mt-0.5 w-12 h-1 bg-[var(--bg-secondary)] rounded-full" />
        </div>
      )}
    </div>
  )
}
