'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signup } from '@/app/actions/auth'

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-text">Crea account</h1>
        <p className="text-sm text-muted mt-1">Inizia a scoprire le serate</p>
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

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm text-bright">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="Minimo 8 caratteri"
            minLength={8}
            className="w-full bg-card border border-border-md rounded-xl px-4 py-3 text-base text-text placeholder:text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-accent text-inv font-semibold rounded-xl px-4 py-3 text-sm hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? 'Registrazione in corso…' : 'Crea account'}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        Hai già un account?{' '}
        <Link href="/login" className="text-accent hover:text-accent/80 transition-colors">
          Accedi
        </Link>
      </p>
    </div>
  )
}
