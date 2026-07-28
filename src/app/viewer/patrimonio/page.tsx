'use client'

import PainelPatrimonio from '@/components/ui/patrimonio/PainelPatrimonio'

// Mesma tela do admin — o escopo de unidades já vem aplicado no servidor,
// pelo tenantFilter da listagem de chamados.
export default function ViewerPatrimonioPage() {
  return <PainelPatrimonio voltarPara="/viewer" />
}
