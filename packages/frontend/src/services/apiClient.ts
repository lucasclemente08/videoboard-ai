/**
 * API client with automatic auth token injection and 401 redirect.
 * Call this once at app startup.
 */
export function initApiClient() {
  const originalFetch = window.fetch;

  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const token = localStorage.getItem('vb_token');
    const headers = new Headers(init?.headers || {});
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return originalFetch(input, { ...init, headers }).then((response) => {
      if (response.status === 401) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : '';
        const isApiCall = url.startsWith('/api/');
        const isLoginOrPublic = url.includes('/login') || url.includes('/auth/') || url === '/api/health' || url === '/api/docs';

        if (isApiCall && !isLoginOrPublic) {
          // Clone to read body
          return response.clone().json().then((body) => {
            if (body?.error?.code === 'UNAUTHORIZED') {
              localStorage.removeItem('vb_token');
              // Redirect without blocking the original promise
              setTimeout(() => { window.location.href = '/login'; }, 100);
            }
            return response;
          }).catch(() => {
            // Not JSON, return as-is
            return response;
          });
        }
      }
      return response;
    });
  };
}
