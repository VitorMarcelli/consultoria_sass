'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function SessionGuardian() {
  const supabase = createClient();

  const getDeviceSessionId = () => {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.match(/(^|;)\s*device_session_id=([^;]+)/);
    return match ? match[2] : '';
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${apiUrl}/auth/sessions/check`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'X-Device-Session-Id': getDeviceSessionId(),
          },
        });

        if (res.status === 401) {
          // A sessão foi invalidada no backend (desconectada ou iniciada em outro lugar)
          await supabase.auth.signOut();
          window.location.href = '/login?revoked=true';
        }
      } catch (err) {
        // Ignorar falha leve de rede para não desconectar offline acidentalmente
      }
    };

    // Checar imediatamente e a cada 5 segundos
    checkSession();
    const interval = setInterval(checkSession, 5000);

    return () => clearInterval(interval);
  }, [supabase.auth]);

  return null;
}
