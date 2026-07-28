'use client'

import PainelPatrimonio from '@/components/ui/patrimonio/PainelPatrimonio'

// Lê chamados com bem vinculado — não mais o Trílogo ao vivo. Os tickets do
// Trílogo chegam aqui pela sincronização (ver chamados-sync.service).
export default function AdminPatrimonioPage() {
  return <PainelPatrimonio voltarPara="/admin" />
}
