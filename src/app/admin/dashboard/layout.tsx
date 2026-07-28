import { notFound } from 'next/navigation'
import { TELAS_OCULTAS } from '../_modules'

// O Dashboard de Rouparia pertence ao módulo Higienização e Limpeza, que está
// fora do ar por ora. Sumir o card do /admin não basta: a URL continua sendo
// digitável e a página buscaria dados normalmente.
//
// A guarda lê a mesma lista que monta o menu, então o dia em que o módulo
// voltar (removendo `oculto` em _modules.ts) esta tela volta junto — sem
// ninguém precisar lembrar que existia um guard escondido aqui.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (TELAS_OCULTAS.includes('/admin/dashboard')) notFound()
  return <>{children}</>
}
