import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { KeyRound, LogOut } from 'lucide-react'
import {
  clearIamBrowserAuth,
  clearIamSession,
  idpApi,
  getCurrentIamRealmId,
  getCurrentIamSessionId,
} from './services/standaloneApi'

const HeadlessIam = lazy(() => import('./pages/HeadlessIam').then((module) => ({ default: module.HeadlessIam })))
const IamLogin = lazy(() => import('./pages/IamLogin').then((module) => ({ default: module.IamLogin })))
const IamAccount = lazy(() => import('./pages/IamAccount').then((module) => ({ default: module.IamAccount })))

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="text-sm text-slate-600 dark:text-slate-400">Loading identity workspace...</p>
      </div>
    </div>
  )
}

function buildIamLoginRedirectPath(pathname: string, search: string, hash: string) {
  const nextPath = `${pathname}${search}${hash}`
  const params = new URLSearchParams()

  if (nextPath && nextPath !== '/iam/login') {
    params.set('next', nextPath)
  }

  const query = params.toString()
  return query ? `/iam/login?${query}` : '/iam/login'
}

function ProtectedIamRoute({ children }: { children: React.ReactElement }) {
  const location = useLocation()
  const [validationState, setValidationState] = useState<'checking' | 'authenticated' | 'unauthenticated'>(() => {
    const activeRealmId = getCurrentIamRealmId()
    const activeSessionId = getCurrentIamSessionId()
    return activeRealmId && activeSessionId ? 'checking' : 'unauthenticated'
  })

  useEffect(() => {
    const activeRealmId = getCurrentIamRealmId()
    const activeSessionId = getCurrentIamSessionId()

    if (!activeRealmId || !activeSessionId) {
      setValidationState('unauthenticated')
      return
    }

    let cancelled = false
    setValidationState('checking')

    void idpApi.getIamAccountSession(activeRealmId, activeSessionId)
      .then(() => {
        if (!cancelled) {
          setValidationState('authenticated')
        }
      })
      .catch((error: any) => {
        if (cancelled) {
          return
        }
        console.error('Failed to validate standalone IAM session:', error)
        clearIamSession()
        clearIamBrowserAuth()
        setValidationState('unauthenticated')
      })

    return () => {
      cancelled = true
    }
  }, [location.pathname, location.search, location.hash])

  if (validationState === 'checking') {
    return <RouteLoadingFallback />
  }

  if (validationState !== 'authenticated') {
    return (
      <Navigate
        to={buildIamLoginRedirectPath(location.pathname, location.search, location.hash)}
        replace
      />
    )
  }

  return children
}

function OidcCallbackPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const callbackParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const code = callbackParams.get('code')
  const state = callbackParams.get('state')
  const error = callbackParams.get('error')
  const errorDescription = callbackParams.get('error_description')

  useEffect(() => {
    if (!code && !error) {
      navigate('/iam/login', { replace: true })
    }
  }, [code, error, navigate])

  if (!code && !error) {
    return null
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          OIDC Callback
        </p>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
          {error ? 'OIDC Callback Error' : 'OIDC Callback Received'}
        </h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          This route preserves the authorization response so supported OIDC browser clients can complete or inspect the redirect result.
        </p>
        <dl className="mt-6 space-y-4">
          {code ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Code</dt>
              <dd className="mt-1 break-all rounded-2xl bg-slate-100 px-4 py-3 font-mono text-xs text-slate-900 dark:bg-slate-950 dark:text-slate-100">
                {code}
              </dd>
            </div>
          ) : null}
          {state ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">State</dt>
              <dd className="mt-1 break-all rounded-2xl bg-slate-100 px-4 py-3 font-mono text-xs text-slate-900 dark:bg-slate-950 dark:text-slate-100">
                {state}
              </dd>
            </div>
          ) : null}
          {error ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Error</dt>
              <dd className="mt-1 break-all rounded-2xl bg-rose-50 px-4 py-3 font-mono text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-100">
                {error}
                {errorDescription ? `: ${errorDescription}` : ''}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>
    </main>
  )
}

function StandaloneAppBanner() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeRealmId, setActiveRealmId] = useState<string | null>(() => getCurrentIamRealmId())
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => getCurrentIamSessionId())
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const showBanner = location.pathname.startsWith('/iam') && location.pathname !== '/iam/login'

  useEffect(() => {
    setActiveRealmId(getCurrentIamRealmId())
    setActiveSessionId(getCurrentIamSessionId())
  }, [location.pathname, location.search])

  const handleLogout = async () => {
    if (isLoggingOut) {
      return
    }

    const realmId = getCurrentIamRealmId()
    const sessionId = getCurrentIamSessionId()
    setIsLoggingOut(true)
    try {
      if (realmId && sessionId) {
        await idpApi.logoutIamAccount(realmId, sessionId)
      }
    } catch (error) {
      console.error('Standalone IAM logout failed:', error)
    } finally {
      toast.dismiss()
      clearIamSession()
      clearIamBrowserAuth()
      setActiveRealmId(null)
      setActiveSessionId(null)
      setIsLoggingOut(false)
      navigate('/iam/login?logged_out=1', { replace: true })
    }
  }

  if (!showBanner) {
    return null
  }

  return (
    <header className="border-b border-slate-200 bg-slate-950 text-white dark:border-slate-800 dark:bg-slate-100 dark:text-slate-900">
      <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] dark:bg-slate-900/10">
            <KeyRound className="h-3.5 w-3.5" />
            IDP
          </span>
          <span className="text-sm font-medium">Standalone Identity Platform</span>
          {activeRealmId ? (
            <span className="text-xs text-slate-300 dark:text-slate-600">Realm: {activeRealmId}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/iam"
            className="rounded-full border border-white/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] transition-colors hover:bg-white/10 dark:border-slate-500 dark:hover:bg-slate-200"
          >
            Workspace
          </Link>
          <Link
            to="/iam/account"
            className="rounded-full border border-white/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] transition-colors hover:bg-white/10 dark:border-slate-500 dark:hover:bg-slate-200"
          >
            Account
          </Link>
          {activeSessionId ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-900 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <LogOut className="h-3.5 w-3.5" />
              {isLoggingOut ? 'Logging Out' : 'Logout'}
            </button>
          ) : (
            <Link
              to="/iam/login"
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-900 transition-colors hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <StandaloneAppBanner />
        <Routes>
          <Route path="/" element={<Navigate to="/iam" replace />} />
          <Route
            path="/iam"
            element={(
              <ProtectedIamRoute>
                <HeadlessIam />
              </ProtectedIamRoute>
            )}
          />
          <Route path="/iam/login" element={<IamLogin />} />
          <Route
            path="/iam/account"
            element={(
              <ProtectedIamRoute>
                <IamAccount />
              </ProtectedIamRoute>
            )}
          />
          <Route path="/login/callback" element={<OidcCallbackPage />} />
          <Route path="*" element={<Navigate to="/iam" replace />} />
        </Routes>
      </div>
    </Suspense>
  )
}
