import { Component } from 'react'
import { SUPPORT_PHONE, SUPPORT_WA_URL } from '../lib/support'
import { api } from '../lib/api'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children

    const msg = this.state.error?.message || String(this.state.error)

    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-secondary)] p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#fbe7e7] flex items-center justify-center mx-auto mb-4 text-3xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold font-[family-name:var(--font-heading)] text-[var(--color-text)]">Something went wrong</h1>
          <p className="text-sm text-black/50 mt-2">Shifa Suite ran into an unexpected error. Your data is safe.</p>
          {msg ? (
            <pre className="mt-4 text-xs text-left bg-black/5 rounded-xl p-3 overflow-auto max-h-32 text-black/50 whitespace-pre-wrap break-all">{msg}</pre>
          ) : null}
          <div className="mt-6 space-y-3">
            <button
              onClick={() => this.setState({ error: null })}
              className="w-full px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-sm hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => api.app.openExternal(SUPPORT_WA_URL)}
              className="w-full px-5 py-2.5 rounded-xl border border-black/10 text-[var(--color-primary)] font-semibold text-sm hover:bg-[var(--color-secondary)] transition-colors"
            >
              WhatsApp Support: {SUPPORT_PHONE}
            </button>
          </div>
        </div>
      </div>
    )
  }
}
