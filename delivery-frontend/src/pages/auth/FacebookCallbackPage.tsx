import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { FacebookCallbackMessage } from '@/utils/oauthPopups';

export function FacebookCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payload: FacebookCallbackMessage = {
      type: 'FACEBOOK_OAUTH_CALLBACK',
      code: params.get('code') || undefined,
      state: params.get('state') || undefined,
      error: params.get('error') || undefined,
      errorDescription: params.get('error_description') || undefined,
    };

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, window.location.origin);
      window.close();
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 px-4 text-center">
      <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
      <p className="text-sm font-semibold">
        Conectando con Facebook... puedes cerrar esta ventana si no se cierra
        automáticamente.
      </p>
    </div>
  );
}
