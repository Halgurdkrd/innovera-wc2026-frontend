/**
 * Central API configuration.
 * API_BASE resolves to the Next.js rewrite proxy (/api/vps → http://72.62.35.32)
 * so all fetch calls are same-origin (no CORS, no mixed-content).
 *
 * Override with NEXT_PUBLIC_API_URL in Vercel env vars if needed
 * (e.g. to point back at HF Space: https://halgurdkrd-innovera-wc2026-api.hf.space).
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || '/api/vps'

/** Convenience wrapper — sets Content-Type automatically. */
export async function fetchAPI(
  endpoint: string,
  options?: RequestInit,
): Promise<Response> {
  const url = `${API_BASE}${endpoint}`
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
}
