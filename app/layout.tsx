import type { Metadata } from 'next';
import './globals.css';
import { PwaInstallPrompt } from '../components/PwaInstallPrompt';

export const metadata: Metadata = {
  title: "FunVoyage - Kids' World Passport",
  description: 'Turn trips into core memories with AI-powered travel journaling for kids',
  applicationName: 'FunVoyage',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FunVoyage" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#fdfcfa" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <script src="https://accounts.google.com/gsi/client" async defer />
      </head>
      <body className="antialiased">
        <PwaInstallPrompt />
        {children}
      </body>
    </html>
  );
}

