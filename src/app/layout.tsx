import type { Metadata } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'
import Providers from './providers'

const cairo = Cairo({ subsets: ['latin'], weight: ['400', '600', '700', '800'] })

export const metadata: Metadata = {
  title: 'Sistema de Patrimônio',
  description: 'Controle e gestão de patrimônio',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={cairo.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
