import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Couple Task Sync',
  description: 'Secure shared task app for two users'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="dark">
      <body>{children}</body>
    </html>
  );
}
