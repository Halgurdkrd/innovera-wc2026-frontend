import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Innovera World Cup AI Predictor',
    short_name: 'Innovera Predictor',
    description:
      'AI-powered FIFA World Cup 2026 predictions, luck scores, momentum analytics, and group standings.',
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
