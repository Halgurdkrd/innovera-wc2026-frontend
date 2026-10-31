import type { Metadata } from 'next'

// Internal page: not linked from the site and kept out of search results.
export const metadata: Metadata = { title: 'System status', robots: { index: false, follow: false } }

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return children
}
