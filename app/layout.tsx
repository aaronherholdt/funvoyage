import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "FunVoyage - Kids' World Passport",
  description: 'Turn trips into core memories with AI-powered travel journaling for kids',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#fdfcfa" />
        <script src="https://accounts.google.com/gsi/client" async defer />
      </head>
      <body className="antialiased overscroll-none">
        {/* TEST BANNER - Remove before merging to main */}
        <div className="bg-purple-600 text-white text-center py-3 px-4 font-bold">
          THIS IS THE PREVIEW VERSION
        </div>
        {children}
      </body>
    </html>
  );
}

