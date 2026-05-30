'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { login, loginWithGoogle } from '@/app/actions/auth'
import { useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined)
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const error = searchParams.get('error')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-text">Accedi</h1>
        <p className="text-sm text-muted mt-1">Benvenuto di ritorno</p>
      </div>

      {message && (
        <p className="text-sm text-green bg-green/10 border border-green/20 rounded-lg px-3 py-2">
          {message}
        </p>
      )}
      {(error || state?.error) && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          {error === 'auth_callback_failed' ? 'Autenticazione fallita, riprova.' : state?.error ?? 'Errore sconosciuto'}
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
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm text-bright">Password</label>
            <Link href="/forgot-password" className="text-xs text-accent hover:text-accent/80 transition-colors">
              Hai dimenticato la password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full bg-card border border-border-md rounded-xl px-4 py-3 text-base text-text placeholder:text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-accent text-inv font-semibold rounded-xl px-4 py-3 text-sm hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? 'Accesso in corso…' : 'Accedi'}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-bg px-2 text-muted">oppure</span>
        </div>
      </div>

      <form action={loginWithGoogle}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-3 bg-elev border border-border-md rounded-xl px-4 py-3 text-sm text-text hover:bg-elev2 transition-colors"
        >
          <GoogleIcon />
          Continua con Google
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        Non hai un account?{' '}
        <Link href="/signup" className="text-accent hover:text-accent/80 transition-colors">
          Registrati
        </Link>
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
