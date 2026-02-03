import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FunVoyage - Kids' World Passport",
    short_name: 'FunVoyage',
    description: 'Turn trips into core memories with AI-powered travel journaling for kids',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fdfcfa',
    theme_color: '#fdfcfa',
    orientation: 'portrait',
    lang: 'en',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
