'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { usePreview, DEVICES } from '@/context/preview-context'
import { DeviceWrapper } from './preview-panel'

/**
 * Device Carousel — shows the preview across multiple devices simultaneously.
 * Horizontal scroll with snapping, all iframes live-updating together.
 */
export function DeviceCarousel() {
  const { previewUrl, refreshKey, setActiveDevice, setCarouselMode } = usePreview()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null)

  // Devices to show in carousel (skip 'responsive')
  const carouselDevices = DEVICES.filter(d => d.id !== 'responsive')

  const scrollTo = useCallback((direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = scrollRef.current.clientWidth * 0.6
    scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' })
  }, [])

  // Click a device to switch to single-device mode with that device
  const selectDevice = useCallback((id: string) => {
    setActiveDevice(id as any)
    setCarouselMode(false)
  }, [setActiveDevice, setCarouselMode])

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Carousel header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:layout-grid" width={14} height={14} className="text-[var(--brand)]" />
          <span className="text-[11px] font-medium text-[var(--text-primary)]">Device Carousel</span>
          <span className="text-[10px] text-[var(--text-disabled)]">— click any device to focus</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => scrollTo('left')} className="p-1 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-disabled)] hover:text-[var(--text-secondary)] cursor-pointer">
            <Icon icon="lucide:chevron-left" width={14} height={14} />
          </button>
          <button onClick={() => scrollTo('right')} className="p-1 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-disabled)] hover:text-[var(--text-secondary)] cursor-pointer">
            <Icon icon="lucide:chevron-right" width={14} height={14} />
          </button>
        </div>
      </div>

      {/* Scrollable carousel */}
      <div
        ref={scrollRef}
        className="flex-1 flex items-center gap-8 overflow-x-auto overflow-y-hidden px-8 py-6 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {carouselDevices.map(device => (
          <div
            key={device.id}
            className={`shrink-0 snap-center cursor-pointer transition-all duration-300 ${
              hoveredDevice === device.id ? 'scale-105' : 'scale-100'
            }`}
            onMouseEnter={() => setHoveredDevice(device.id)}
            onMouseLeave={() => setHoveredDevice(null)}
            onClick={() => selectDevice(device.id)}
          >
            <DeviceWrapper device={device}>
              <iframe
                key={`${device.id}-${refreshKey}`}
                src={previewUrl}
                className="w-full h-full border-0 bg-white pointer-events-none"
                sandbox="allow-scripts allow-same-origin allow-forms"
                title={`Preview — ${device.label}`}
                loading="lazy"
              />
            </DeviceWrapper>
          </div>
        ))}
      </div>
    </div>
  )
}
