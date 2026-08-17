'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Shield, Smartphone, Sparkles, LogOut, RefreshCcw } from 'lucide-react'
import { getPendingSessions, revokeAndRetryLogin, retryPendingLogin, cancelPendingLogin } from './actions'

interface PendingSession {
  id: string
  deviceFamily: string
  browser: string
  location: string | null
  ipAddress: string | null
  lastActive: string
}

export default function LimiteAtingidoClient() {
  const [sessions, setSessions] = useState<PendingSession[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)
  const [autoRetried, setAutoRetried] = useState(false)

  const load = async () => {
    setLoading(true)
    const { sessions: fetched } = await getPendingSessions()
    if (fetched === null) {
      setExpired(true)
      setSessions(null)
    } else {
      setSessions(fetched)
    }
    setLoading(false)
    return fetched
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Se por algum motivo a lista já vier vazia (ex: outra sessão expirou
  // sozinha entre o bloqueio e o carregamento desta tela), tenta completar o
  // login automaticamente uma vez antes de exigir qualquer ação manual.
  useEffect(() => {
    if (!loading && sessions !== null && sessions.length === 0 && !autoRetried) {
      setAutoRetried(true)
      setRetrying(true)
      retryPendingLogin().then((result) => {
        if (result && !result.success) {
          setMessage(result.message || null)
          setRetrying(false)
        }
      })
    }
  }, [loading, sessions, autoRetried])

  const handleRevoke = async (sessionId: string) => {
    setBusyId(sessionId)
    setMessage(null)
    const result = await revokeAndRetryLogin(sessionId)
    if (result && !result.success) {
      setMessage(result.message || 'Não foi possível desconectar esse dispositivo.')
      setBusyId(null)
      await load()
    }
  }

  const handleRetry = async () => {
    setRetrying(true)
    setMessage(null)
    const result = await retryPendingLogin()
    if (result && !result.success) {
      setMessage(result.message || null)
      setRetrying(false)
      await load()
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg rounded-[2rem] border border-slate-100 bg-white p-10 shadow-xl shadow-slate-900/5"
      >
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Shield className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Limite de acessos atingido</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Esta conta já tem o número máximo de dispositivos conectados ao mesmo tempo.
            </p>
          </div>
        </div>

        {expired ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              Essa tentativa de login expirou. Volte e faça login novamente.
            </div>
            <a
              href="/login"
              className="flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-slate-800"
            >
              Voltar para o login
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm font-medium text-slate-500">
              Escolha um dispositivo abaixo para desconectar e entrar automaticamente no lugar dele — ou peça a um
              administrador para aumentar o limite em Configurações.
            </p>

            {message && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-600">
                {message}
              </div>
            )}

            {loading || (retrying && sessions?.length === 0) ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
              </div>
            ) : (
              <div className="space-y-3">
                {sessions?.map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                        <Smartphone className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {session.deviceFamily} · {session.browser}
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-slate-500">
                          {session.location || 'Localização indisponível'} · Último acesso:{' '}
                          {new Date(session.lastActive).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRevoke(session.id)}
                      disabled={busyId !== null || retrying}
                      className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyId === session.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <LogOut className="h-3.5 w-3.5" />
                      )}
                      Desconectar e continuar
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying || busyId !== null}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Tentar novamente
              </button>
              <form action={cancelPendingLogin} className="flex-1">
                <button
                  type="submit"
                  className="w-full rounded-2xl px-4 py-3 text-sm font-bold text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-600"
                >
                  Cancelar
                </button>
              </form>
            </div>

            <div className="flex items-center gap-2 pt-2 text-xs font-medium text-slate-400">
              <Sparkles className="h-3.5 w-3.5" />
              Login em aba anônima sempre conta como um dispositivo novo.
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
