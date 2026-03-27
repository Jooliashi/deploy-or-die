import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Deploy or Die',
  description:
    'Multiplayer browser chaos where engineers race through deploy prompts and role-specific mini-games.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

