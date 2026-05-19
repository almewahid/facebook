export const TOKEN_STORAGE_KEY = 'fb_poster_access_token';

export function authHeaders(extra = {}) {
  let token = '';
  try {
    token = localStorage.getItem(TOKEN_STORAGE_KEY) || '';
  } catch {
    token = '';
  }
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function authFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: authHeaders(options.headers || {}),
  });
}
