import {
  Building2, Users, Activity, LayoutDashboard, Package,
  Settings, Boxes, Sparkles, Inbox,
  type LucideIcon,
} from 'lucide-react'

// Painel de administração agrupado por setor. O /admin mostra os módulos; cada um
// abre em /admin/m/{slug} com suas telas.
//
// As telas e os respectivos `superAdminOnly` são exatamente os que existiam na lista
// plana anterior — este arquivo só reorganiza, não muda quem enxerga o quê.
// _modules.test.ts trava esse contrato.

export type AdminAction = {
  href: string
  icon: LucideIcon
  title: string
  description: string
  color: string
  superAdminOnly: boolean
}

export type AdminModule = {
  slug: 'administrativo' | 'patrimonio' | 'higienizacao'
  href: string
  icon: LucideIcon
  title: string
  description: string
  color: string
  superAdminOnly: boolean
  /**
   * Fora do ar temporariamente. Some do /admin e as rotas do módulo passam a
   * responder 404 — inclusive quando a URL é digitada à mão.
   *
   * Marcar em vez de apagar: o módulo volta removendo esta linha, sem precisar
   * reconstruir a definição das telas nem lembrar onde elas ficavam.
   */
  oculto?: boolean
  actions: AdminAction[]
}

export const ADMIN_MODULES: AdminModule[] = [
  {
    slug: 'administrativo',
    href: '/admin/m/administrativo',
    icon: Settings,
    title: 'Administrativo',
    description: 'Gerencie unidades e usuários do sistema',
    color: '#6366f1',
    superAdminOnly: false,
    actions: [
      {
        href: '/admin/tenants',
        icon: Building2,
        title: 'Unidades',
        description: 'Gerencie hospitais e unidades cadastradas no sistema',
        color: '#6366f1',
        superAdminOnly: true,
      },
      {
        href: '/admin/usuarios',
        icon: Users,
        title: 'Usuários',
        description: 'Gerencie contas de acesso e permissões dos usuários',
        color: '#0369a1',
        superAdminOnly: false,
      },
    ],
  },
  {
    slug: 'patrimonio',
    href: '/admin/m/patrimonio',
    icon: Boxes,
    title: 'Patrimônio',
    description: 'Monitore rondas, chamados de manutenção e bens por ambiente',
    color: '#7c3aed',
    superAdminOnly: false,
    actions: [
      {
        href: '/admin/rondas',
        icon: Activity,
        title: 'Monitoramento de Rondas',
        description: 'Visualize histórico de inspeções e ocorrências de todas as unidades',
        color: '#059669',
        superAdminOnly: false,
      },
      {
        href: '/admin/chamados',
        icon: Inbox,
        title: 'Painel de Chamados',
        description: 'Indicadores dos chamados de manutenção: status, prioridade, atrasados e valor gasto',
        color: '#7c3aed',
        superAdminOnly: false,
      },
      {
        href: '/admin/patrimonio',
        icon: Package,
        title: 'Tickets de Patrimônio',
        description: 'Visualize tickets de manutenção com bens patrimoniais vinculados via Trílogo',
        color: '#7c3aed',
        superAdminOnly: false,
      },
      {
        href: '/admin/bens',
        icon: Package,
        title: 'Bens por Ambiente',
        description: 'Consulte todos os bens patrimoniais cadastrados por setor e ambiente',
        color: '#0891b2',
        superAdminOnly: false,
      },
    ],
  },
  {
    slug: 'higienizacao',
    href: '/admin/m/higienizacao',
    icon: Sparkles,
    title: 'Higienização e Limpeza',
    description: 'Acompanhe o processamento de roupas das unidades',
    color: '#f97316',
    // Única tela do módulo é superAdminOnly; marcar o módulo também evita card vazio.
    superAdminOnly: true,
    oculto: true,
    actions: [
      {
        href: '/admin/dashboard',
        icon: LayoutDashboard,
        title: 'Dashboard de Rouparia',
        description: 'Acompanhe retiradas, devoluções e pendências de rouparia em todas as unidades',
        color: '#f97316',
        superAdminOnly: true,
      },
    ],
  },
]

/** Módulos que aparecem na UI. Único lugar que decide isso. */
export const MODULOS_VISIVEIS: AdminModule[] = ADMIN_MODULES.filter((m) => !m.oculto)

/**
 * Busca por slug para exibição. Módulo oculto devolve undefined de propósito:
 * quem chama usa isso para 404, então a URL digitada à mão também não abre.
 */
export function getModule(slug: AdminModule['slug']): AdminModule | undefined {
  return MODULOS_VISIVEIS.find((m) => m.slug === slug)
}

/** Telas de módulos ocultos — usado pelas guardas de rota das próprias telas. */
export const TELAS_OCULTAS: string[] = ADMIN_MODULES
  .filter((m) => m.oculto)
  .flatMap((m) => m.actions.map((a) => a.href))
