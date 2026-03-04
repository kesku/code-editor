'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Icon } from '@iconify/react'

interface YTPlayerState {
  videoId: string
  title: string
  channelTitle: string
  thumbnail: string
  isPlaying: boolean
  currentTime: number
  duration: number
}

const YOUTUBE_IFRAME_API = 'https://www.youtube.com/iframe_api'
const YT_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ?? ''

declare global {
  interface Window {
    YT: {
      Player: new (el: string | HTMLElement, opts: Record<string, unknown>) => YTPlayer
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number }
    }
    onYouTubeIframeAPIReady: () => void
  }
}

interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  stopVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  setVolume(volume: number): void
  getVolume(): number
  mute(): void
  unMute(): void
  isMuted(): boolean
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): number
  getVideoData(): { video_id: string; title: string; author: string }
  destroy(): void
}

interface YTSearchResult {
  id: string
  title: string
  channel: string
  thumbnail: string
}

const DEMO_VIDEOS: YTSearchResult[] = [
  { id: 'jfKfPfyJRdk', title: 'lofi hip hop radio - beats to relax/study to', channel: 'Lofi Girl', thumbnail: '' },
  { id: '5qap5aO4i9A', title: 'lofi hip hop radio - beats to sleep/chill to', channel: 'Lofi Girl', thumbnail: '' },
  { id: 'rUxyKA_-grg', title: 'Synthwave Radio - Retrowave Mix', channel: 'Musicwave', thumbnail: '' },
  { id: 'DWcJFNfaw9c', title: 'Jazz For Work & Study', channel: 'JAZZ', thumbnail: '' },
  { id: '36YnV9STBqc', title: 'Coffee Shop Ambience', channel: 'Calm', thumbnail: '' },
]

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function YouTubePlayer() {
  const [apiReady, setApiReady] = useState(false)
  const [apiError, setApiError] = useState(false)
  const [playerState, setPlayerState] = useState<YTPlayerState | null>(null)
  const [volume, setVolume] = useState(50)
  const [muted, setMuted] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<YTSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [showPlayer, setShowPlayer] = useState(false)

  const playerRef = useRef<YTPlayer | null>(null)
  const embedRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const volumeRef = useRef(50)
  const mutedRef = useRef(false)
  const volumeBeforeMute = useRef(50)
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingVideoRef = useRef<{ id: string; title?: string; channel?: string } | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  volumeRef.current = volume
  mutedRef.current = muted

  useEffect(() => {
    if (window.YT?.Player) { setApiReady(true); return }
    if (document.querySelector(`script[src="${YOUTUBE_IFRAME_API}"]`)) {
      const check = setInterval(() => {
        if (window.YT?.Player) { setApiReady(true); clearInterval(check) }
      }, 200)
      setTimeout(() => { clearInterval(check); if (!window.YT?.Player) setApiError(true) }, 10_000)
      return () => clearInterval(check)
    }
    window.onYouTubeIframeAPIReady = () => setApiReady(true)
    const script = document.createElement('script')
    script.src = YOUTUBE_IFRAME_API
    script.async = true
    script.onerror = () => setApiError(true)
    document.body.appendChild(script)
  }, [])

  const destroyPlayer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (playerRef.current) {
      try { playerRef.current.destroy() } catch {}
      playerRef.current = null
    }
  }, [])

  const initPlayer = useCallback((videoId: string, title?: string, channel?: string) => {
    if (!window.YT?.Player) return

    destroyPlayer()

    const el = embedRef.current
    if (!el) return

    // YT.Player replaces the target element, so create a fresh child div each time
    el.innerHTML = ''
    const target = document.createElement('div')
    target.id = 'yt-player-target'
    el.appendChild(target)

    const player = new window.YT.Player('yt-player-target', {
      height: '1',
      width: '1',
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        fs: 0,
        playsinline: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          player.setVolume(volumeRef.current)
          if (mutedRef.current) player.mute()
          const data = player.getVideoData()
          setPlayerState({
            videoId,
            title: data.title || title || 'Unknown',
            channelTitle: data.author || channel || '',
            thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            isPlaying: true,
            currentTime: 0,
            duration: player.getDuration() || 0,
          })
          timerRef.current = setInterval(() => {
            if (playerRef.current) {
              try {
                const t = playerRef.current.getCurrentTime()
                const d = playerRef.current.getDuration()
                setCurrentTime(t)
                setPlayerState(prev => prev ? { ...prev, currentTime: t, duration: d || prev.duration } : prev)
              } catch {}
            }
          }, 500)
          window.dispatchEvent(new CustomEvent('youtube-state-changed', { detail: { playing: true } }))
        },
        onStateChange: (event: { data: number }) => {
          const playing = event.data === window.YT.PlayerState.PLAYING
          const ended = event.data === window.YT.PlayerState.ENDED
          setPlayerState(prev => prev ? { ...prev, isPlaying: playing } : prev)
          window.dispatchEvent(new CustomEvent('youtube-state-changed', { detail: { playing } }))
          if (ended) {
            const random = DEMO_VIDEOS[Math.floor(Math.random() * DEMO_VIDEOS.length)]
            initPlayer(random.id, random.title, random.channel)
          }
        },
        onError: () => {
          setPlayerState(prev => prev ? { ...prev, isPlaying: false } : prev)
        },
      },
    })
    playerRef.current = player
  }, [destroyPlayer])

  const playVideo = useCallback((videoId: string, title?: string, channel?: string) => {
    if (!apiReady) {
      pendingVideoRef.current = { id: videoId, title, channel }
      return
    }

    setShowPlayer(true)
    // Wait for React to render the embed container before initializing
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        initPlayer(videoId, title, channel)
      })
    })
  }, [apiReady, initPlayer])

  // Play pending video once API becomes ready
  useEffect(() => {
    if (apiReady && pendingVideoRef.current) {
      const { id, title, channel } = pendingVideoRef.current
      pendingVideoRef.current = null
      playVideo(id, title, channel)
    }
  }, [apiReady, playVideo])

  useEffect(() => {
    return () => destroyPlayer()
  }, [destroyPlayer])

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return
    if (playerState?.isPlaying) {
      playerRef.current.pauseVideo()
    } else {
      playerRef.current.playVideo()
    }
  }, [playerState?.isPlaying])

  const handleVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(v)))
    setVolume(clamped)
    setMuted(clamped === 0)
    playerRef.current?.setVolume(clamped)
    if (clamped > 0) playerRef.current?.unMute()
  }, [])

  const toggleMute = useCallback(() => {
    if (muted) {
      handleVolume(volumeBeforeMute.current)
      playerRef.current?.unMute()
    } else {
      volumeBeforeMute.current = volume
      handleVolume(0)
      playerRef.current?.mute()
    }
  }, [muted, volume, handleVolume])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !playerState) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    const seekTo = pct * playerState.duration
    playerRef.current.seekTo(seekTo, true)
    setCurrentTime(seekTo)
  }, [playerState])

  const stopPlaying = useCallback(() => {
    destroyPlayer()
    setPlayerState(null)
    setShowPlayer(false)
    setCurrentTime(0)
    window.dispatchEvent(new CustomEvent('youtube-state-changed', { detail: { playing: false } }))
  }, [destroyPlayer])

  const ytSearchAvailable = !!YT_API_KEY

  const onQueryChange = useCallback((v: string) => {
    setQuery(v)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!v.trim()) { setSearchResults([]); setSearching(false); return }
    if (!ytSearchAvailable) return
    setSearching(true)
    searchTimeout.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          part: 'snippet',
          q: v,
          type: 'video',
          videoCategoryId: '10',
          maxResults: '10',
          key: YT_API_KEY,
        })
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
        if (!res.ok) { setSearchResults([]); return }
        const data = await res.json()
        const items: YTSearchResult[] = (data.items ?? []).map((item: Record<string, unknown>) => {
          const snippet = item.snippet as Record<string, unknown>
          const thumbs = snippet.thumbnails as Record<string, { url: string }>
          return {
            id: (item.id as Record<string, string>).videoId,
            title: snippet.title as string,
            channel: snippet.channelTitle as string,
            thumbnail: thumbs?.medium?.url ?? thumbs?.default?.url ?? '',
          }
        }).filter((v: YTSearchResult) => v.id)
        setSearchResults(items)
      } catch {} finally { setSearching(false) }
    }, 400)
  }, [ytSearchAvailable])

  const filteredVideos = ytSearchAvailable && query.trim()
    ? searchResults
    : query.trim()
      ? DEMO_VIDEOS.filter(v =>
          v.title.toLowerCase().includes(query.toLowerCase()) ||
          v.channel.toLowerCase().includes(query.toLowerCase())
        )
      : DEMO_VIDEOS

  const track = playerState
  const paused = !playerState?.isPlaying
  const duration = playerState?.duration ?? 0
  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

  return (
    <div className="flex flex-col w-full h-full bg-[var(--bg)] overflow-hidden">
      {/* Header — YouTube style */}
      <div className="flex items-center h-7 px-2.5 border-b border-[var(--border)] bg-[var(--bg-elevated)] shrink-0">
        <Icon icon="mdi:youtube" width={14} height={14} className="text-[#FF0000] shrink-0" />
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-disabled)] ml-1.5">YouTube</span>
        <div className="flex-1" />
        <button
          onClick={() => { setShowSearch(v => !v); setTimeout(() => inputRef.current?.focus(), 100) }}
          className={`p-0.5 rounded cursor-pointer ${showSearch ? 'text-[#FF0000]' : 'text-[var(--text-disabled)] hover:text-[var(--text-secondary)]'}`}
          title="Search"
        >
          <Icon icon="lucide:search" width={11} height={11} />
        </button>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="border-b border-[var(--border)]">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5">
            <Icon icon="lucide:search" width={10} height={10} className="text-[var(--text-disabled)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setShowSearch(false); onQueryChange('') } }}
              placeholder={ytSearchAvailable ? 'Search YouTube…' : 'Search videos…'}
              className="flex-1 bg-transparent text-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] outline-none"
              autoFocus
              spellCheck={false}
            />
            {query && (
              <button onClick={() => onQueryChange('')} className="p-0.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-disabled)] cursor-pointer">
                <Icon icon="lucide:x" width={10} height={10} />
              </button>
            )}
          </div>
          <div className="max-h-[200px] overflow-y-auto border-t border-[var(--border)]">
            {searching ? (
              <div className="flex items-center gap-2 px-3 py-2.5">
                <Icon icon="lucide:loader-2" width={11} height={11} className="text-[var(--text-disabled)] animate-spin" />
                <span className="text-[9px] text-[var(--text-disabled)]">Searching…</span>
              </div>
            ) : (
              <>
                {filteredVideos.map(v => (
                  <button
                    key={v.id}
                    onClick={() => { playVideo(v.id, v.title, v.channel); setShowSearch(false); onQueryChange('') }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--bg-subtle)] cursor-pointer text-left"
                  >
                    <img
                      src={v.thumbnail || `https://img.youtube.com/vi/${v.id}/default.jpg`}
                      alt=""
                      className="w-8 h-6 rounded object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-[var(--text-primary)] truncate">{v.title}</div>
                      <div className="text-[9px] text-[var(--text-tertiary)] truncate">{v.channel}</div>
                    </div>
                  </button>
                ))}
                {filteredVideos.length === 0 && (
                  <div className="px-3 py-2.5 text-[9px] text-[var(--text-disabled)]">No results</div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Hidden iframe player — always rendered so the ref is stable */}
      <div
        ref={embedRef}
        className={showPlayer ? 'w-0 h-0 overflow-hidden absolute' : 'hidden'}
        aria-hidden="true"
      />

      {/* Now playing */}
      <div className="flex-1 flex flex-col">
        {track ? (
          <div className="flex flex-col gap-2 p-3">
            {/* Thumbnail */}
            <div className="w-full aspect-video rounded-lg overflow-hidden bg-[var(--bg-subtle)] relative group">
              <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-white/90 text-black flex items-center justify-center cursor-pointer hover:bg-white"
                >
                  <Icon icon={paused ? 'lucide:play' : 'lucide:pause'} width={18} height={18} />
                </button>
              </div>
            </div>

            {/* Track info */}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[var(--text-primary)] truncate leading-tight">{track.title}</p>
              <p className="text-[10px] text-[var(--text-tertiary)] truncate">{track.channelTitle}</p>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono text-[var(--text-disabled)] w-7 text-right shrink-0">{formatTime(currentTime)}</span>
              <div
                className="flex-1 h-1 rounded-full bg-[var(--bg-subtle)] cursor-pointer group relative"
                onClick={handleSeek}
              >
                <div className="h-full rounded-full bg-[#FF0000] relative" style={{ width: `${progressPct}%` }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#FF0000] shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <span className="text-[8px] font-mono text-[var(--text-disabled)] w-7 shrink-0">{formatTime(duration)}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  const random = DEMO_VIDEOS[Math.floor(Math.random() * DEMO_VIDEOS.length)]
                  playVideo(random.id, random.title, random.channel)
                }}
                className="w-7 h-7 rounded-md hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] flex items-center justify-center cursor-pointer"
                title="Previous"
              >
                <Icon icon="lucide:skip-back" width={13} height={13} />
              </button>
              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-[var(--text-primary)] text-[var(--bg)] flex items-center justify-center cursor-pointer hover:opacity-90"
                title={paused ? 'Play' : 'Pause'}
              >
                <Icon icon={paused ? 'lucide:play' : 'lucide:pause'} width={14} height={14} />
              </button>
              <button
                onClick={() => {
                  const random = DEMO_VIDEOS[Math.floor(Math.random() * DEMO_VIDEOS.length)]
                  playVideo(random.id, random.title, random.channel)
                }}
                className="w-7 h-7 rounded-md hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] flex items-center justify-center cursor-pointer"
                title="Next"
              >
                <Icon icon="lucide:skip-forward" width={13} height={13} />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-1.5 mt-1">
              <button onClick={toggleMute} className="w-5 h-5 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] cursor-pointer shrink-0">
                <Icon icon={muted || volume === 0 ? 'lucide:volume-x' : volume < 50 ? 'lucide:volume-1' : 'lucide:volume-2'} width={12} height={12} />
              </button>
              <div
                className="flex-1 h-1 rounded-full bg-[var(--bg-subtle)] cursor-pointer group relative"
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  handleVolume(((e.clientX - rect.left) / rect.width) * 100)
                }}
              >
                <div className="h-full rounded-full bg-[var(--text-tertiary)] group-hover:bg-[#FF0000] transition-colors relative" style={{ width: `${volume}%` }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--text-primary)] shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <span className="text-[8px] font-mono text-[var(--text-disabled)] w-5 text-right shrink-0">{volume}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-8 px-3">
            <Icon icon="mdi:youtube" width={24} height={24} className={apiError ? 'text-[var(--color-deletions)]' : 'text-[var(--text-disabled)]'} />
            <p className="text-[10px] text-[var(--text-tertiary)] text-center">
              {apiError ? 'Could not load YouTube' : 'Play music while you code'}
            </p>
            {apiError ? (
              <button
                onClick={() => { setApiError(false); window.location.reload() }}
                className="h-7 px-3 rounded-md text-[10px] font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                Retry
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    const random = DEMO_VIDEOS[Math.floor(Math.random() * DEMO_VIDEOS.length)]
                    playVideo(random.id, random.title, random.channel)
                  }}
                  className="h-7 px-3 rounded-md text-[10px] font-medium bg-[#FF0000] text-white hover:bg-[#cc0000] cursor-pointer"
                >
                  Play something
                </button>
                <button
                  onClick={() => { setShowSearch(true); setTimeout(() => inputRef.current?.focus(), 100) }}
                  className="h-6 px-2.5 rounded-md text-[9px] font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                >
                  Browse library
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center h-6 px-2.5 border-t border-[var(--border)] shrink-0">
        <span className="text-[8px] text-[var(--text-disabled)]">{track ? 'Now playing' : 'YouTube Music'}</span>
        <div className="flex-1" />
        {track && (
          <button onClick={stopPlaying} className="text-[8px] text-[var(--text-disabled)] hover:text-[var(--text-secondary)] cursor-pointer">
            Stop
          </button>
        )}
      </div>
    </div>
  )
}
