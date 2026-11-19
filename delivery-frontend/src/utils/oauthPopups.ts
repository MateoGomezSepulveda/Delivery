interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleErrorResponse {
  type?: string;
  message?: string;
}

interface GoogleOAuth2Client {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

interface GoogleIdentityGlobal {
  accounts?: {
    oauth2?: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        prompt?: string;
        callback: (response: GoogleTokenResponse) => void;
        error_callback?: (error: GoogleErrorResponse) => void;
      }) => GoogleOAuth2Client;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityGlobal;
  }
}

const GOOGLE_GIS_SRC = 'https://accounts.google.com/gsi/client';
const FACEBOOK_OAUTH_STATE_KEY = 'delivery_fb_oauth_state_v1';

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Entorno de navegador no disponible.'));
  }

  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_GIS_SRC}"]`,
    );

    if (existing) {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => {
          googleScriptPromise = null;
          reject(
            new Error(
              'No se pudo cargar el servicio de Google. Verifica tu conexión o desactiva bloqueadores de anuncios.',
            ),
          );
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      googleScriptPromise = null;
      reject(
        new Error(
          'No se pudo cargar el servicio de Google. Verifica tu conexión o desactiva bloqueadores de anuncios.',
        ),
      );
    };
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim());
}

export function isFacebookOAuthConfigured(): boolean {
  return Boolean(import.meta.env.VITE_FACEBOOK_APP_ID?.trim());
}

/**
 * Abre la ventana emergente oficial de Google Identity Services para elegir cuenta
 * y devuelve el accessToken OAuth 2.0 para que el backend NestJS lo valide.
 */
export async function requestGoogleAccessToken(): Promise<{
  accessToken: string;
}> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error(
      'El inicio de sesión con Google aún no está configurado en este entorno.',
    );
  }

  await loadGoogleIdentityScript();

  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) {
    throw new Error(
      'No se pudo inicializar la ventana de Google. Recarga la página e intenta de nuevo.',
    );
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      prompt: 'select_account',
      callback: (response) => {
        if (settled) return;
        settled = true;

        if (response.error || !response.access_token) {
          reject(
            new Error(
              response.error_description ||
                'No se completó el acceso con Google.',
            ),
          );
          return;
        }

        resolve({ accessToken: response.access_token });
      },
      error_callback: (err) => {
        if (settled) return;
        settled = true;

        if (err.type === 'popup_closed') {
          reject(new Error('Cerraste la ventana de Google antes de continuar.'));
          return;
        }
        if (err.type === 'popup_failed_to_open') {
          reject(
            new Error(
              'El navegador bloqueó la ventana emergente de Google. Permite popups para continuar.',
            ),
          );
          return;
        }
        reject(
          new Error(
            err.message || 'No se pudo completar el inicio de sesión con Google.',
          ),
        );
      },
    });

    client.requestAccessToken({ prompt: 'select_account' });
  });
}

function generateOAuthState(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface FacebookCallbackMessage {
  type: 'FACEBOOK_OAUTH_CALLBACK';
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

/**
 * Abre la ventana emergente oficial de Facebook OAuth 2.0 (Authorization Code Flow)
 * compatible con http://localhost:5173 y HTTPS producción, y retorna { code, redirectUri }.
 */
export async function requestFacebookAuthCode(): Promise<{
  code: string;
  redirectUri: string;
}> {
  const appId = import.meta.env.VITE_FACEBOOK_APP_ID?.trim();
  if (!appId) {
    throw new Error(
      'El inicio de sesión con Facebook aún no está configurado en este entorno.',
    );
  }

  const state = generateOAuthState();
  sessionStorage.setItem(FACEBOOK_OAUTH_STATE_KEY, state);

  const redirectUri = `${window.location.origin}/auth/facebook/callback`;
  const authUrl = new URL('https://www.facebook.com/v20.0/dialog/oauth');
  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'email,public_profile');
  authUrl.searchParams.set('state', state);

  const width = 520;
  const height = 640;
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

  const popup = window.open(
    authUrl.toString(),
    'deliverypro_facebook_oauth',
    `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,status=no,resizable=yes,scrollbars=yes`,
  );

  if (!popup) {
    sessionStorage.removeItem(FACEBOOK_OAUTH_STATE_KEY);
    throw new Error(
      'El navegador bloqueó la ventana emergente de Facebook. Permite popups para continuar.',
    );
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      window.clearInterval(closedPoll);
      sessionStorage.removeItem(FACEBOOK_OAUTH_STATE_KEY);
    };

    const handleMessage = (event: MessageEvent<FacebookCallbackMessage>) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'FACEBOOK_OAUTH_CALLBACK') return;

      if (settled) return;
      settled = true;
      cleanup();

      const expectedState = state;
      if (!event.data.state || event.data.state !== expectedState) {
        reject(
          new Error(
            'La sesión de verificación de Facebook no coincide. Intenta nuevamente.',
          ),
        );
        return;
      }

      if (event.data.error || !event.data.code) {
        reject(
          new Error(
            event.data.errorDescription ||
              'Se canceló el inicio de sesión con Facebook.',
          ),
        );
        return;
      }

      resolve({ code: event.data.code, redirectUri });
    };

    const closedPoll = window.setInterval(() => {
      if (popup.closed && !settled) {
        settled = true;
        cleanup();
        reject(new Error('Cerraste la ventana de Facebook antes de continuar.'));
      }
    }, 400);

    window.addEventListener('message', handleMessage);
  });
}
