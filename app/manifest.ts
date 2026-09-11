import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ennovera | Premier League 2026-27',
    short_name: 'Ennovera',
    description:
      'AI-powered Premier League 2026-27 predictions and match analytics.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0D1117',
    theme_color: '#F0A500',
    orientation: 'portrait',
    categories: ['sports', 'entertainment'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
