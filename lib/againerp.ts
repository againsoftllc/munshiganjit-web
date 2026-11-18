/* AgainERP storefront API for the My Gadget Setup and Partner Program plugins.
   Set NEXT_PUBLIC_AGAINERP_API (e.g. http://localhost:8010). Unset, or the API is down / the
   plugin is off → null, and the site keeps its built-in data.
   `token`: the signed-in customer's session (the partner calls are made as that account). */
export const AGAINERP_API = (process.env.NEXT_PUBLIC_AGAINERP_API || '').replace(/\/$/, '');

export async function erp<T>(path: string, body?: unknown, token?: string | null): Promise<T | null> {
  if (!AGAINERP_API) return null;
  try {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = 'Bearer ' + token;
    const r = await fetch(AGAINERP_API + '/api/v1/storefront/munshiganjit' + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: Object.keys(headers).length ? headers : undefined,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}
