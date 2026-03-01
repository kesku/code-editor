/**
 * Shared diff computation — used by diff-review-panel, git-panel, changes-panel.
 */

export interface DiffLine {
  type: 'context' | 'added' | 'removed' | 'header'
  oldNum?: number
  newNum?: number
  content: string
}

/**
 * Compute a line-level diff using LCS algorithm.
 * Falls back to fast O(n) comparison for large files (>2000 total lines).
 */
export function computeDiff(original: string, proposed: string): DiffLine[] {
  const oldLines = original.split('\n')
  const newLines = proposed.split('\n')
  const result: DiffLine[] = []
  const m = oldLines.length, n = newLines.length

  // Fast path for large files
  if (m + n > 2000) {
    const maxLen = Math.max(m, n)
    for (let i = 0; i < maxLen; i++) {
      if (i < m && i < n && oldLines[i] === newLines[i]) {
        result.push({ type: 'context', oldNum: i + 1, newNum: i + 1, content: oldLines[i] })
      } else {
        if (i < m) result.push({ type: 'removed', oldNum: i + 1, content: oldLines[i] })
        if (i < n) result.push({ type: 'added', newNum: i + 1, content: newLines[i] })
      }
    }
    return result
  }

  // LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  // Backtrack
  const ops: Array<{ type: 'keep' | 'del' | 'add'; line: string; oldIdx?: number; newIdx?: number }> = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.unshift({ type: 'keep', line: oldLines[i - 1], oldIdx: i, newIdx: j })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: 'add', line: newLines[j - 1], newIdx: j })
      j--
    } else {
      ops.unshift({ type: 'del', line: oldLines[i - 1], oldIdx: i })
      i--
    }
  }

  for (const op of ops) {
    if (op.type === 'keep') result.push({ type: 'context', oldNum: op.oldIdx, newNum: op.newIdx, content: op.line })
    else if (op.type === 'del') result.push({ type: 'removed', oldNum: op.oldIdx, content: op.line })
    else result.push({ type: 'added', newNum: op.newIdx, content: op.line })
  }

  return result
}

/**
 * Count additions and deletions from a diff.
 */
export function countChanges(original: string, proposed: string): { additions: number; deletions: number } {
  const lines = computeDiff(original, proposed)
  return {
    additions: lines.filter(l => l.type === 'added').length,
    deletions: lines.filter(l => l.type === 'removed').length,
  }
}
