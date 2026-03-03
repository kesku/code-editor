'use client'

import { useEffect } from 'react'
import { usePlugins } from '@/context/plugin-context'
import { YouTubePlayer } from './youtube-player'
import { YouTubeStatusBar } from './youtube-status-bar'

export function YouTubePlugin() {
  const { registerPlugin, unregisterPlugin } = usePlugins()

  useEffect(() => {
    registerPlugin('sidebar', {
      id: 'youtube-player',
      component: YouTubePlayer,
      order: 20,
    })

    registerPlugin('status-bar-right', {
      id: 'youtube-status-bar',
      component: YouTubeStatusBar,
      order: 20,
    })

    return () => {
      unregisterPlugin('youtube-player')
      unregisterPlugin('youtube-status-bar')
    }
  }, [registerPlugin, unregisterPlugin])

  return null
}
