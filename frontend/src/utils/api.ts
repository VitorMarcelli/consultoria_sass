import { createClient } from '@/utils/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export async function apiRequest(path: string, options: RequestInit = {}) {
  let token: string | undefined;

  try {
    // Only import and use the browser-side Supabase client (100% client-safe)
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token;
  } catch (err) {
    console.warn('Falha ao obter sessão do Supabase no cliente:', err);
  }

  const headers = new Headers(options.headers);
  
  // Headers for tunnel bypass (localtunnel, ngrok, etc) during external validation
  headers.set('Bypass-Tunnel-Reminder', 'true');
  headers.set('ngrok-skip-browser-warning', 'true');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    throw new Error('Token JWT ausente no frontend. O usuário pode não estar autenticado ou a sessão não pôde ser lida.');
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Ocorreu um erro na requisição.');
  }

  return response.json();
}
