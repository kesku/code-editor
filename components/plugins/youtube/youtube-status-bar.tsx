'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'

interface TrackInfo {
  title: string
  playing: boolean
}

export function YouTubeStatusBar() {
  const [track, setTrack] = useState<TrackInfo | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail) { setTrack(null); return }
      setTrack(prev => ({
        title: prev?.title ?? '',
        playing: detail.playing ?? false,
      }))
    }
    window.addEventListener('youtube-state-changed', handler)
    return () => window.removeEventListener('youtube-state-changed', handler)
  }, [])

  if (!track?.playing) return null

  return (
    <span
      className="flex items-center gap-1 max-w-[120px] text-[var(--text-tertiary)] cursor-default"
      title="YouTube playing"
    >
      <Icon
        icon="mdi:youtube"
        width={10}
        height={10}
        className="text-[#FF0000] shrink-0"
      />
      <span className="truncate text-[10px]">Playing</span>
    </span>
  )
}
