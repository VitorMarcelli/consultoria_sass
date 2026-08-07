'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers, cookies } from 'next/headers'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error, data: authData } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/login?error=true')
  }

  // sessionRejected/rejectionReason ficam FORA do try/catch de propósito: o
  // redirect() do Next lança um erro especial internamente, e um catch que
  // envolvesse esse redirect acabaria engolindo esse throw como se fosse uma
  // falha de rede qualquer.
  let sessionRejected = false
  let rejectionReason = 'true'

  try {
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || ''
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || '127.0.0.1'
    const token = authData?.session?.access_token

    if (token) {
      // Gerar e gravar device_session_id exclusivo em cookie para evitar divergência de session_id do Supabase
      const deviceSessionId = crypto.randomUUID()
      const cookieStore = await cookies()
      cookieStore.set('device_session_id', deviceSessionId, { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: false })

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${apiUrl}/auth/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Device-Session-Id': deviceSessionId
        },
        body: JSON.stringify({ userAgent, ipAddress, deviceSessionId }),
      })

      if (!res.ok) {
        sessionRejected = true
        if (res.status === 403) {
          const body = await res.json().catch(() => ({}))
          if (body?.message === 'SESSION_LIMIT_REACHED') {
            rejectionReason = 'session_limit'
          }
        }
      }
    }
  } catch (err) {
    // Falha de rede/backend fora do ar não deve bloquear o login — só uma
    // recusa de verdade (403 do nosso próprio backend) vira bloqueio.
    console.error('Erro ao registrar sessão no backend:', err)
  }

  if (sessionRejected) {
    // O login no Supabase já tinha sido concluído (é independente do nosso
    // backend) — sem desfazer com signOut aqui, a pessoa continuaria
    // conseguindo entrar no app mesmo com o limite de acessos estourado.
    await supabase.auth.signOut()
    redirect(`/login?error=${rejectionReason}`)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
