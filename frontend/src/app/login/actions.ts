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
      await fetch(`${apiUrl}/auth/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userAgent, ipAddress, deviceSessionId }),
      })
    }
  } catch (err) {
    console.error('Erro ao registrar sessão no backend:', err)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
