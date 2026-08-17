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
      // Reaproveita o device_session_id já salvo neste navegador, se existir
      // — só gera um novo na primeira vez. Antes deste recurso de limite de
      // acessos, regerar a cada login era inofensivo (o backend só olhava
      // "existe uma sessão mais nova?"); agora a identidade do dispositivo
      // precisa ser estável entre logins pra createSession() reconhecer "é o
      // mesmo aparelho relogando" em vez de contar como um slot novo a cada
      // vez — sem isso, relogar repetidas vezes no mesmo navegador ia
      // acumulando sessões "ativas" pra sempre até estourar qualquer limite.
      const cookieStore = await cookies()
      let deviceSessionId = cookieStore.get('device_session_id')?.value
      if (!deviceSessionId) {
        deviceSessionId = crypto.randomUUID()
        cookieStore.set('device_session_id', deviceSessionId, { path: '/', maxAge: 60 * 60 * 24 * 30, httpOnly: false })
      }

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
    // Caso específico de limite de acessos: em vez de jogar a pessoa de
    // volta pro login com um beco sem saída ("peça pra um admin"), guardamos
    // os tokens da sessão Supabase que JÁ tinha logado com sucesso (server
    // actions não expõem isso ao client) num cookie httpOnly de vida curta,
    // e mandamos pra uma tela de autoatendimento onde ela mesma escolhe
    // qual dispositivo desconectar. scope:'local' limpa só os cookies desta
    // aba (fechando o desvio de simplesmente navegar pra "/" sem nunca
    // completar o registro de sessão) sem revogar o refresh token no
    // Supabase, que ainda vai ser reaproveitado se ela liberar uma vaga.
    if (rejectionReason === 'session_limit' && authData?.session?.refresh_token) {
      await supabase.auth.signOut({ scope: 'local' })

      const cookieStore = await cookies()
      const payload = Buffer.from(
        JSON.stringify({
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
        })
      ).toString('base64')
      cookieStore.set('pending_login', payload, {
        path: '/login',
        httpOnly: true,
        maxAge: 60 * 5,
        secure: process.env.NODE_ENV === 'production',
      })

      redirect('/login/limite-atingido')
    }

    // O login no Supabase já tinha sido concluído (é independente do nosso
    // backend) — sem desfazer com signOut aqui, a pessoa continuaria
    // conseguindo entrar no app mesmo com o limite de acessos estourado.
    await supabase.auth.signOut()
    redirect(`/login?error=${rejectionReason}`)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
