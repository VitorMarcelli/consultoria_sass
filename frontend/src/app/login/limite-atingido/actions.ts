'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

interface PendingTokens {
  access_token: string
  refresh_token: string
}

// O access_token do Supabase continua válido pra checagem via JWKS mesmo
// depois do signOut({ scope: 'local' }) em login/actions.ts (esse scope só
// limpa cookies locais, não revoga o token no servidor) — por isso dá pra
// reusar os endpoints normais de /auth/sessions aqui sem precisar de rota
// nova no backend.
async function readPendingTokens(): Promise<PendingTokens | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('pending_login')?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
    if (!parsed?.access_token || !parsed?.refresh_token) return null
    return parsed
  } catch {
    return null
  }
}

async function clearPendingTokens() {
  const cookieStore = await cookies()
  cookieStore.delete('pending_login')
}

const apiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function getPendingSessions() {
  const tokens = await readPendingTokens()
  if (!tokens) return { sessions: null as any[] | null }

  try {
    const res = await fetch(`${apiUrl()}/auth/sessions`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      cache: 'no-store',
    })
    if (!res.ok) return { sessions: null }
    const sessions = await res.json()
    return { sessions: (sessions as any[]).filter((s) => s.isActive) }
  } catch {
    return { sessions: null }
  }
}

async function completeLogin(tokens: PendingTokens): Promise<{ success: boolean; message?: string }> {
  const cookieStore = await cookies()
  let deviceSessionId = cookieStore.get('device_session_id')?.value
  if (!deviceSessionId) {
    deviceSessionId = crypto.randomUUID()
    cookieStore.set('device_session_id', deviceSessionId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: false,
    })
  }

  const res = await fetch(`${apiUrl()}/auth/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.access_token}`,
      'X-Device-Session-Id': deviceSessionId,
    },
    body: JSON.stringify({ deviceSessionId }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return {
      success: false,
      message:
        body?.message === 'SESSION_LIMIT_REACHED'
          ? 'Ainda no limite de acessos — desconecte outro dispositivo da lista.'
          : 'Não foi possível concluir o login. Tente novamente.',
    }
  }

  // Restabelece a sessão real do Supabase (cookies que o middleware
  // reconhece) a partir dos tokens guardados — o setSession refaz o que o
  // signOut({ scope: 'local' } ) tinha limpado.
  const supabase = await createClient()
  const { error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  })
  if (error) {
    return { success: false, message: 'Sua sessão expirou. Faça login novamente.' }
  }

  return { success: true }
}

export async function revokeAndRetryLogin(sessionId: string) {
  const tokens = await readPendingTokens()
  if (!tokens) redirect('/login')

  await fetch(`${apiUrl()}/auth/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  }).catch(() => {})

  const result = await completeLogin(tokens)
  if (!result.success) return result

  await clearPendingTokens()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function retryPendingLogin() {
  const tokens = await readPendingTokens()
  if (!tokens) redirect('/login')

  const result = await completeLogin(tokens)
  if (!result.success) return result

  await clearPendingTokens()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function cancelPendingLogin() {
  await clearPendingTokens()
  redirect('/login')
}
