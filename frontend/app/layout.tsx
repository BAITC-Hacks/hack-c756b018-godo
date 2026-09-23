import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Career Quest — развитие с ясной целью',
  description: 'Персональная карта развития и HR-аналитика Career Quest',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
