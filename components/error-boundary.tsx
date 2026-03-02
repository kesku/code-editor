'use client'

import { Component, type ReactNode } from 'react'
import { Icon } from '@iconify/react'

interface Props {
  children: ReactNode
  fallbackLabel?: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <Icon icon="lucide:alert-triangle" width={24} height={24} className="text-red-400" />
          </div>
          <div className="space-y-1 max-w-sm">
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">
              {this.props.fallbackLabel ?? 'Something went wrong'}
            </p>
            <p className="text-[11px] font-mono text-[var(--text-disabled)] break-all">
              {this.state.error.message}
            </p>
          </div>
          <button
            onClick={this.reset}
            className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
