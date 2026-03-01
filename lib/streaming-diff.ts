/**
 * Streaming diff engine — tracks file changes in real-time as the agent
 * streams edit proposals. Emits events for live UI updates.
 */

export interface StreamingFileChange {
  path: string
  original: string
  proposed: string
  additions: number
  deletions: number
  status: 'streaming' | 'pending' | 'accepted' | 'rejected'
  /** Lines that changed since last emit (for animation) */
  newlyChangedLines: number[]
}

export class StreamingDiffEngine {
  private changes = new Map<string, StreamingFileChange>()
  private originals = new Map<string, string>()
  private emitTimer: ReturnType<typeof setTimeout> | null = null

  /** Register original file content before edits */
  registerOriginal(path: string, content: string) {
    this.originals.set(path, content)
  }

  /** Update a file's proposed content (called as agent streams) */
  updateProposed(path: string, proposed: string) {
    const original = this.originals.get(path) ?? ''
    const oldLines = original.split('\n')
    const newLines = proposed.split('\n')

    // Count additions/deletions
    let additions = 0, deletions = 0
    const changedLines: number[] = []
    const maxLen = Math.max(oldLines.length, newLines.length)
    for (let i = 0; i < maxLen; i++) {
      if (i >= oldLines.length) { additions++; changedLines.push(i) }
      else if (i >= newLines.length) { deletions++ }
      else if (oldLines[i] !== newLines[i]) { additions++; deletions++; changedLines.push(i) }
    }

    const existing = this.changes.get(path)
    const prevChangedSet = new Set(existing?.newlyChangedLines ?? [])
    const newlyChanged = changedLines.filter(l => !prevChangedSet.has(l))

    this.changes.set(path, {
      path,
      original,
      proposed,
      additions,
      deletions,
      status: 'streaming',
      newlyChangedLines: newlyChanged,
    })

    this.scheduleEmit()
  }

  /** Mark a file as done streaming */
  finalize(path: string) {
    const c = this.changes.get(path)
    if (c) {
      c.status = 'pending'
      c.newlyChangedLines = []
    }
    this.scheduleEmit()
  }

  /** Finalize all streaming files */
  finalizeAll() {
    for (const c of this.changes.values()) {
      if (c.status === 'streaming') {
        c.status = 'pending'
        c.newlyChangedLines = []
      }
    }
    this.emit()
  }

  /** Accept a file's changes */
  accept(path: string) {
    const c = this.changes.get(path)
    if (c) c.status = 'accepted'
    this.emit()
  }

  /** Reject a file's changes */
  reject(path: string) {
    const c = this.changes.get(path)
    if (c) c.status = 'rejected'
    this.emit()
  }

  acceptAll() {
    for (const c of this.changes.values()) if (c.status === 'pending') c.status = 'accepted'
    this.emit()
  }

  rejectAll() {
    for (const c of this.changes.values()) if (c.status === 'pending') c.status = 'rejected'
    this.emit()
  }

  /** Get all tracked changes */
  getChanges(): StreamingFileChange[] {
    return Array.from(this.changes.values())
  }

  /** Get summary stats */
  getSummary() {
    const changes = this.getChanges()
    return {
      fileCount: changes.length,
      additions: changes.reduce((s, c) => s + c.additions, 0),
      deletions: changes.reduce((s, c) => s + c.deletions, 0),
      streaming: changes.filter(c => c.status === 'streaming').length,
      pending: changes.filter(c => c.status === 'pending').length,
      accepted: changes.filter(c => c.status === 'accepted').length,
    }
  }

  /** Clear all tracked changes */
  clear() {
    this.changes.clear()
    this.originals.clear()
    this.emit()
  }

  private scheduleEmit() {
    if (this.emitTimer) return
    this.emitTimer = setTimeout(() => {
      this.emitTimer = null
      this.emit()
    }, 50) // 20fps update rate
  }

  private emit() {
    const changes = this.getChanges()
    const summary = this.getSummary()
    window.dispatchEvent(new CustomEvent('diff-review-update', {
      detail: { changes, summary }
    }))
    window.dispatchEvent(new CustomEvent('change-summary-update', {
      detail: summary
    }))
  }
}

/** Singleton instance */
export const diffEngine = new StreamingDiffEngine()
