import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[AppErrorBoundary]', error, info.componentStack)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  override render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-6 py-16"
          role="alert"
        >
          <p className="text-4xl mb-4" aria-hidden>
            ⚠
          </p>
          <h1 className="text-xl font-bold text-amber-400 mb-2">Something went wrong</h1>
          <p className="text-white/60 text-sm text-center max-w-md mb-6">
            {this.state.error.message || 'An unexpected error occurred in the UI.'}
          </p>
          <button
            type="button"
            onClick={() => {
              this.handleReset()
              window.location.assign('/')
            }}
            className="rounded-xl bg-amber-400 px-6 py-3 font-bold text-black hover:bg-amber-300 transition-colors"
          >
            Back to home
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
