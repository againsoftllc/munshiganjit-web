/* Where to go after signing in / registering: the page the visitor came from (?next=/reseller), else the account page.
   Only a path on this site is accepted, never another address. */
export function afterAuth(): string {
  try {
    const next = new URLSearchParams(location.search).get('next') || '';
    if (/^\/(?!\/)[\w\-./?=&%#]*$/.test(next)) return next;
  } catch { /* no window */ }
  return '/account';
}
