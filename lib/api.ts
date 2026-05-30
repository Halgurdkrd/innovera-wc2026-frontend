/**
 * Central API base URL.
 * Default: /api/vps  (Next.js rewrite → http://72.62.35.32)
 * Override: set NEXT_PUBLIC_API_URL to a full URL (e.g. HF Space) if needed.
 * Empty string or unset → always uses the VPS proxy.
 */
export const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? '').trim() || '/api/vps'

export async function fetchAPI(
  endpoint: string,
  options?: RequestInit,
): Promise<Response> {
  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
}
