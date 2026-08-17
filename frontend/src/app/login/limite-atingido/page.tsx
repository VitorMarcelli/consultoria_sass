import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LimiteAtingidoClient from './LimiteAtingidoClient'

export default async function LimiteAtingidoPage() {
  const cookieStore = await cookies()
  if (!cookieStore.get('pending_login')?.value) {
    redirect('/login')
  }

  return <LimiteAtingidoClient />
}
