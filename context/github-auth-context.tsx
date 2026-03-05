'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { useGateway } from '@/context/gateway-context'
import { setGithubToken, requestDeviceCode, pollDeviceToken } from '@/lib/github-api'
import { isTauri, tauriInvoke } from '@/lib/tauri'

const LEGACY_STORAGE_KEY = 'code-editor:github-token'
const STORAGE_SOURCE_KEY = 'code-editor:github-token-source'
const KEYCHAIN_SERVICE = 'OpenKnots.KnotCode'
const KEYCHAIN_ACCOUNT = 'github-token'
const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ?? ''

/** Decodes the legacy localStorage token format to allow one-time migration. */
function decodeLegacyToken(encoded: string): string {
  try {
    const decoded = atob(encoded)
    return decoded
      .split('')
      .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (42 + (i % 7))))
      .join('')
  } catch {
    return ''
  }
}

export type OAuthStep =
  | { type: 'idle' }
  | {
      type: 'device-pending'
      userCode: string
      verificationUri: string
      verificationUriComplete: string
      deviceCode: string
      interval: number
    }
  | { type: 'error'; message: string }

type TokenSource = 'gateway' | 'manual' | 'oauth' | 'none'

interface GitHubAuthContextValue {
  /** The resolved GitHub token (from gateway, user input, or OAuth) */
  token: string
  /** Where the token came from */
  source: TokenSource
  /** Whether we're still resolving the token */
  loading: boolean
  /** Manually set a token (stored in keychain on desktop, memory on web) */
  setManualToken: (token: string) => void
  /** Clear the manual token */
  clearToken: () => void
  /** Whether the user has a valid token */
  authenticated: boolean
  /** Whether the GitHub OAuth Client ID is configured */
  oauthAvailable: boolean
  /** Current state of the OAuth device flow */
  oauthStep: OAuthStep
  /** Start the OAuth device flow */
  startOAuth: () => void
  /** Cancel an in-progress OAuth flow */
  cancelOAuth: () => void
}

const GitHubAuthContext = createContext<GitHubAuthContextValue | null>(null)

export function GitHubAuthProvider({ children }: { children: ReactNode }) {
  const { sendRequest, status: gwStatus } = useGateway()
  const [token, setToken] = useState('')
  const [source, setSource] = useState<TokenSource>('none')
  const [loading, setLoading] = useState(true)
  const [oauthStep, setOAuthStep] = useState<OAuthStep>({ type: 'idle' })
  const oauthCancelled = useRef(false)

  const persistToken = useCallback(async (t: string, src: TokenSource) => {
    if (isTauri()) {
      try {
        await tauriInvoke('local_secret_set', {
          service: KEYCHAIN_SERVICE,
          account: KEYCHAIN_ACCOUNT,
          secret: t,
        })
      } catch {
        // Keep token in-memory even if keychain write fails.
      }
      localStorage.setItem(STORAGE_SOURCE_KEY, src)
    }

    setToken(t)
    setSource(src)
    setGithubToken(t)
  }, [])

  // Resolve token from secure storage (desktop) or one-time legacy migration.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (isTauri()) {
        try {
          const secureToken = await tauriInvoke<string | null>('local_secret_get', {
            service: KEYCHAIN_SERVICE,
            account: KEYCHAIN_ACCOUNT,
          })
          if (cancelled) return
          if (secureToken) {
            const savedSource =
              (localStorage.getItem(STORAGE_SOURCE_KEY) as TokenSource) || 'manual'
            setToken(secureToken)
            setSource(savedSource === 'oauth' ? 'oauth' : 'manual')
            setGithubToken(secureToken)
            setLoading(false)
            return
          }
        } catch {
          // Continue to migration fallback.
        }
      }

      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
      if (legacy) {
        const migrated = decodeLegacyToken(legacy)
        if (migrated) {
          const savedSource = (localStorage.getItem(STORAGE_SOURCE_KEY) as TokenSource) || 'manual'
          await persistToken(migrated, savedSource === 'oauth' ? 'oauth' : 'manual')
        }
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      }

      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [persistToken])

  // Try to resolve token from gateway on connect (highest priority source).
  useEffect(() => {
    if (gwStatus !== 'connected') return

    let cancelled = false
    ;(async () => {
      try {
        const result = (await sendRequest('env.get', { key: 'GITHUB_TOKEN' })) as {
          value?: string
        } | null
        if (cancelled) return
        if (result?.value) {
          setToken(result.value)
          setSource('gateway')
          setGithubToken(result.value)
          setLoading(false)
          return
        }
      } catch {
        // Gateway doesn't support env.get — that's fine
      }

      if (!cancelled) setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [gwStatus, sendRequest])

  const setManualToken = useCallback(
    (t: string) => {
      const trimmed = t.trim()
      if (!trimmed) return
      void persistToken(trimmed, 'manual')
    },
    [persistToken],
  )

  const clearToken = useCallback(() => {
    void (async () => {
      if (isTauri()) {
        try {
          await tauriInvoke('local_secret_delete', {
            service: KEYCHAIN_SERVICE,
            account: KEYCHAIN_ACCOUNT,
          })
        } catch {
          // Clearing in-memory state still logs out the current session.
        }
      }
      localStorage.removeItem(LEGACY_STORAGE_KEY)
      localStorage.removeItem(STORAGE_SOURCE_KEY)
      setToken('')
      setSource('none')
      setGithubToken('')
    })()
  }, [])

  // ── OAuth Device Flow ──────────────────────────────────────────

  const startOAuth = useCallback(async () => {
    if (!GITHUB_CLIENT_ID) {
      setOAuthStep({ type: 'error', message: 'OAuth client ID not configured.' })
      return
    }

    oauthCancelled.current = false

    try {
      const data = await requestDeviceCode(GITHUB_CLIENT_ID)

      // Use the complete URI (pre-fills the code) for one-click experience
      const directUrl =
        data.verification_uri_complete || `${data.verification_uri}?user_code=${data.user_code}`

      setOAuthStep({
        type: 'device-pending',
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        verificationUriComplete: directUrl,
        deviceCode: data.device_code,
        interval: data.interval ?? 5,
      })

      // Auto-open the authorization URL in external browser
      // On Tauri desktop, use shell.open; on web, window.open
      try {
        const w = window as unknown as Record<string, unknown>
        if (w.__TAURI_INTERNALS__ || w.__TAURI__) {
          const { open } = await import('@tauri-apps/plugin-shell')
          await open(directUrl)
        } else {
          window.open(directUrl, '_blank', 'noopener,noreferrer')
        }
      } catch {
        // Fallback: user clicks the link manually
      }
    } catch {
      setOAuthStep({ type: 'error', message: 'Failed to start GitHub authentication.' })
    }
  }, [])

  const cancelOAuth = useCallback(() => {
    oauthCancelled.current = true
    setOAuthStep({ type: 'idle' })
  }, [])

  // Extract stable values to use as deps (avoids ternary expression in dep array)
  const pendingDeviceCode = oauthStep.type === 'device-pending' ? oauthStep.deviceCode : null
  const pendingInterval = oauthStep.type === 'device-pending' ? oauthStep.interval : 5

  useEffect(() => {
    if (!pendingDeviceCode) return

    oauthCancelled.current = false

    const poll = async () => {
      while (!oauthCancelled.current) {
        await new Promise((r) => setTimeout(r, pendingInterval * 1000))
        if (oauthCancelled.current) break

        try {
          const data = await pollDeviceToken(GITHUB_CLIENT_ID, pendingDeviceCode)

          if (data.access_token) {
            await persistToken(data.access_token, 'oauth')
            setOAuthStep({ type: 'idle' })
            break
          }
          if (data.error === 'access_denied' || data.error === 'expired_token') {
            setOAuthStep({ type: 'error', message: 'Authorisation was denied or timed out.' })
            break
          }
        } catch {
          // network hiccup — keep polling
        }
      }
    }

    poll()
    return () => {
      oauthCancelled.current = true
    }
  }, [pendingDeviceCode, pendingInterval, persistToken])

  const authenticated = !!token
  const oauthAvailable = !!GITHUB_CLIENT_ID

  const value = useMemo<GitHubAuthContextValue>(
    () => ({
      token,
      source,
      loading,
      setManualToken,
      clearToken,
      authenticated,
      oauthAvailable,
      oauthStep,
      startOAuth,
      cancelOAuth,
    }),
    [
      token,
      source,
      loading,
      setManualToken,
      clearToken,
      authenticated,
      oauthAvailable,
      oauthStep,
      startOAuth,
      cancelOAuth,
    ],
  )

  return <GitHubAuthContext.Provider value={value}>{children}</GitHubAuthContext.Provider>
}

export function useGitHubAuth() {
  const ctx = useContext(GitHubAuthContext)
  if (!ctx) throw new Error('useGitHubAuth must be used within GitHubAuthProvider')
  return ctx
}
