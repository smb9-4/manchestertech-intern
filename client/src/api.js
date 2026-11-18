const BASE = import.meta.env.VITE_API_URL || '';

export const getToken = () => localStorage.getItem('ih_token');
export const setToken = (t) => (t ? localStorage.setItem('ih_token', t) : localStorage.removeItem('ih_token'));

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body && !form) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + '/api' + path, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  if (res.status === 401 && path !== '/auth/login') {
    setToken(null);
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(data?.error || `Server returned HTTP ${res.status}. Check the deployment logs.`);
  return data;
}

// Download a protected file (adds the token, then saves it)
export async function download(path, filename) {
  const res = await fetch(BASE + '/api' + path, { headers: { Authorization: 'Bearer ' + getToken() } });
  if (!res.ok) throw new Error('Download failed');
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
