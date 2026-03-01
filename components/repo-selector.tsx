'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Icon } from '@iconify/react'
import { useRepo } from '@/context/repo-context'
import { authHeaders } from '@/lib/github-client'

interface BranchInfo {
  name: string
  protected: boolean
}

interface RepoOption {
  name: string
  private: boolean
}

export function RepoSelector() {
  const { repo, setRepo } = useRepo()
  const [editing, setEditing] = useState(!repo)
  const [ownerInput, setOwnerInput] = useState(repo?.owner ?? 'OpenKnots')
  const [repoInput, setRepoInput] = useState(repo?.repo ?? '')
  const [showPrivate, setShowPrivate] = useState(false)
  const [repoOptions, setRepoOptions] = useState<RepoOption[]>([])
  const [repoLoading, setRepoLoading] = useState(false)
  const [repoError, setRepoError] = useState<string | null>(null)
  const [repoDropdown, setRepoDropdown] = useState(false)
  const [branchDropdown, setBranchDropdown] = useState(false)
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [branchLoading, setBranchLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const repoDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setBranchDropdown(false)
      }
      if (repoDropdownRef.current && !repoDropdownRef.current.contains(e.target as Node)) {
        setRepoDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!repo) return
    setOwnerInput(repo.owner)
    setRepoInput(repo.repo)
  }, [repo])

  const handleSubmit = useCallback(() => {
    const owner = ownerInput.trim()
    const repoName = repoInput.trim()
    if (!owner || !repoName) return
    setRepo({ owner, repo: repoName, branch: 'main', fullName: `${owner}/${repoName}` })
    setRepoDropdown(false)
    setEditing(false)
  }, [ownerInput, repoInput, setRepo])

  const fetchReposForOwner = useCallback(async (owner: string) => {
    const normalizedOwner = owner.trim()
    if (!normalizedOwner) {
      setRepoOptions([])
      setRepoError(null)
      return
    }

    setRepoLoading(true)
    setRepoError(null)
    try {
      const headers = authHeaders()
      const fetchAllRepos = async (endpoint: string): Promise<RepoOption[] | null> => {
        const allRepos: RepoOption[] = []
        let page = 1

        while (true) {
          const res = await fetch(`${endpoint}?per_page=100&page=${page}&sort=updated`, { headers })
          if (res.status === 404) return null
          if (!res.ok) throw new Error(`Failed to fetch repositories (${res.status})`)

          const data = await res.json() as Array<{ name: string; private: boolean }>
          allRepos.push(...data.map(r => ({ name: r.name, private: r.private })))
          if (data.length < 100) break
          page += 1
        }

        return allRepos
      }

      const orgRepos = await fetchAllRepos(`https://api.github.com/orgs/${encodeURIComponent(normalizedOwner)}/repos`)
      const repos = orgRepos ?? await fetchAllRepos(`https://api.github.com/users/${encodeURIComponent(normalizedOwner)}/repos`)
      setRepoOptions((repos ?? []).sort((a, b) => a.name.localeCompare(b.name)))
      setRepoError(null)
    } catch (error) {
      setRepoOptions([])
      setRepoError(error instanceof Error ? error.message : 'Failed to fetch repositories')
    } finally {
      setRepoLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!editing) return
    const normalizedOwner = ownerInput.trim()
    if (!normalizedOwner) {
      setRepoOptions([])
      setRepoError(null)
      return
    }

    const timeout = window.setTimeout(() => {
      void fetchReposForOwner(normalizedOwner)
    }, 200)
    return () => window.clearTimeout(timeout)
  }, [editing, ownerInput, fetchReposForOwner])

  const filteredRepoOptions = useMemo(() => {
    const query = repoInput.trim().toLowerCase()
    return repoOptions
      .filter(option => showPrivate || !option.private)
      .filter(option => !query || option.name.toLowerCase().includes(query))
  }, [repoInput, repoOptions, showPrivate])

  const fetchBranches = useCallback(async () => {
    if (!repo) return
    setBranchLoading(true)
    try {
      const res = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}/branches?per_page=30`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json() as Array<{ name: string; protected: boolean }>
      setBranches(data.map(b => ({ name: b.name, protected: b.protected })))
    } catch {
      setBranches([])
    } finally {
      setBranchLoading(false)
    }
  }, [repo])

  const handleBranchClick = useCallback(() => {
    if (!repo) return
    setBranchDropdown(v => !v)
    if (branches.length === 0) fetchBranches()
  }, [repo, branches.length, fetchBranches])

  const switchBranch = useCallback((name: string) => {
    if (!repo) return
    setRepo({ ...repo, branch: name })
    setBranchDropdown(false)
  }, [repo, setRepo])

  if (editing || !repo) {
    return (
      <div ref={repoDropdownRef} className="flex items-center gap-1.5 relative">
        <Icon icon="lucide:git-branch" width={14} height={14} className="text-[var(--text-tertiary)]" />
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={ownerInput}
            onChange={e => {
              setOwnerInput(e.target.value)
              setRepoInput('')
              setRepoDropdown(true)
            }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="organization"
            className="w-28 px-2 py-1 rounded bg-[var(--bg-subtle)] border border-[var(--border)] text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--brand)] font-mono"
            autoFocus
          />
          <span className="text-[11px] text-[var(--text-tertiary)] font-mono">/</span>
          <div className="relative">
            <input
              type="text"
              value={repoInput}
              onChange={e => {
                setRepoInput(e.target.value)
                setRepoDropdown(true)
              }}
              onFocus={() => setRepoDropdown(true)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="repository"
              className="w-36 px-2 py-1 rounded bg-[var(--bg-subtle)] border border-[var(--border)] text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--brand)] font-mono"
            />
            {repoDropdown && ownerInput.trim() && (
              <div className="absolute left-0 top-full mt-1 w-72 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] shadow-xl z-50 py-1">
                <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">Repositories</span>
                  <button
                    type="button"
                    onClick={() => setShowPrivate(v => !v)}
                    className={`text-[10px] px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                      showPrivate
                        ? 'border-[color-mix(in_srgb,var(--brand)_35%,transparent)] text-[var(--brand)]'
                        : 'border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                    }`}
                    title="Toggle private repositories"
                  >
                    {showPrivate ? 'Hide private' : 'Private'}
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {repoLoading ? (
                    <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-[var(--text-secondary)]">
                      <Icon icon="lucide:loader-2" width={12} height={12} className="animate-spin" />
                      Loading repositories...
                    </div>
                  ) : repoError ? (
                    <div className="px-3 py-2 text-[11px] text-[var(--color-deletions)]">{repoError}</div>
                  ) : filteredRepoOptions.length === 0 ? (
                    <div className="px-3 py-2 text-[11px] text-[var(--text-tertiary)]">No repositories found</div>
                  ) : (
                    filteredRepoOptions.map(option => (
                      <button
                        key={option.name}
                        type="button"
                        onClick={() => {
                          setRepoInput(option.name)
                          setRepoDropdown(false)
                        }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-left transition-colors cursor-pointer text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                      >
                        <Icon icon="lucide:folder-git-2" width={12} height={12} className="shrink-0 text-[var(--text-tertiary)]" />
                        <span className="text-[12px] font-mono truncate">{option.name}</span>
                        {option.private && (
                          <Icon icon="lucide:lock" width={11} height={11} className="shrink-0 ml-auto text-[var(--text-tertiary)]" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleSubmit}
          className="p-1 rounded text-[var(--brand)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          title="Open repo"
        >
          <Icon icon="lucide:arrow-right" width={14} height={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Repo name (click to change) */}
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer group"
        title="Change repository"
      >
        <Icon icon="lucide:git-fork" width={13} height={13} className="text-[var(--text-tertiary)]" />
        <span className="text-[12px] font-mono text-[var(--text-primary)] group-hover:text-[var(--brand)]">
          {repo.fullName}
        </span>
      </button>

      {/* Branch switcher */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={handleBranchClick}
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          title="Switch branch"
        >
          <Icon icon="lucide:git-branch" width={12} height={12} />
          <span className="text-[11px] font-mono">{repo.branch}</span>
          <Icon icon="lucide:chevron-down" width={10} height={10} />
        </button>

        {branchDropdown && (
          <div className="absolute left-0 top-full mt-1 w-56 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] shadow-xl z-50 py-1 max-h-[300px] overflow-y-auto">
            {branchLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-[var(--text-secondary)]">
                <Icon icon="lucide:loader-2" width={12} height={12} className="animate-spin" />
                Loading branches...
              </div>
            ) : branches.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-[var(--text-tertiary)]">No branches found</div>
            ) : (
              branches.map(b => (
                <button
                  key={b.name}
                  onClick={() => switchBranch(b.name)}
                  className={`flex items-center gap-2 w-full px-3 py-1.5 text-left transition-colors cursor-pointer ${
                    b.name === repo.branch
                      ? 'bg-[color-mix(in_srgb,var(--brand)_10%,transparent)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon icon="lucide:git-branch" width={12} height={12} className="shrink-0 text-[var(--text-tertiary)]" />
                  <span className="text-[12px] font-mono truncate">{b.name}</span>
                  {b.protected && (
                    <span title="Protected"><Icon icon="lucide:shield" width={10} height={10} className="shrink-0 text-[var(--text-tertiary)]" /></span>
                  )}
                  {b.name === repo.branch && (
                    <Icon icon="lucide:check" width={12} height={12} className="shrink-0 ml-auto text-[var(--brand)]" />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
