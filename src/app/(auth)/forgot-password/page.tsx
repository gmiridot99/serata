'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/app/actions/auth'

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPassword, undefined)

  if (state?.success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-xl font-semibold text-text">Email inviata</h1>
          <p className="text-sm text-muted mt-1">
            Controlla la tua casella di posta e clicca il link per reimpostare la password.
          </p>
        </div>
        <Link
          href="/login"
          className="block text-center text-sm text-accent hover:text-accent/80 transition-colors"
        >
          Torna al login
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-text">Password dimenticata</h1>
        <p className="text-sm text-muted mt-1">
          Inserisci la tua email e ti mandiamo un link per reimpostare la password.
        </p>
      </div>

      {state?.error && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <form action={action} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm text-bright">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="tu@esempio.com"
            className="w-full bg-card border border-border-md rounded-xl px-4 py-3 text-base text-text placeholder:text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-accent text-inv font-semibold rounded-xl px-4 py-3 text-sm hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? 'Invio in corso…' : 'Invia link di reset'}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        <Link href="/login" className="text-accent hover:text-accent/80 transition-colors">
          Torna al login
        </Link>
      </p>
    </div>
  )
}
