/** Cookies are HTTPS-only in production. COOKIE_SECURE=false allows a plain-HTTP trial on an internal network. */
export function secureCookies(): boolean {
  if (process.env.COOKIE_SECURE === "false") return false;
  if (process.env.COOKIE_SECURE === "true") return true;
  return process.env.NODE_ENV === "production";
}
