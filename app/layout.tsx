import type { Metadata } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'
import Providers from './providers'
import MudarSenhaBanner from '@/components/ui/MudarSenhaBanner'

const cairo = Cairo({ subsets: ['latin'], weight: ['400', '600', '700', '800'] })

export const metadata: Metadata = {
  title: 'Sistema de Rouparia',
  description: 'Controle de retirada e devolução de enxoval hospitalar',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={cairo.className}>
        <Providers>
          <MudarSenhaBanner />
          {children}
        </Providers>
      </body>
    </html>
  )
}
