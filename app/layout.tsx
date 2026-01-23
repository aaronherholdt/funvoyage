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
        <script src="https://accounts.google.com/gsi/client" async defer />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

