import { ShieldCheck } from 'lucide-react'
import Text from '@/components/ui/Text'
import { getSession } from '@/lib/auth'
import LogoutButton from '@/components/ui/LogoutButton'
import AdminCardGrid from './_components/AdminCardGrid'
import { ADMIN_MODULES } from './_modules'

export default async function AdminPage() {
  const session = await getSession()
  const isSuperAdmin = session?.role === 'super_admin'
  const isViewer = session?.role === 'viewer'

  // Oculta módulo que exige super_admin e também aquele cujas telas, depois de
  // filtradas, ficariam todas de fora — para não haver card que abre em página vazia.
  const modules = ADMIN_MODULES
    .filter((m) => !m.superAdminOnly || isSuperAdmin)
    .filter((m) => m.actions.some((a) => !a.superAdminOnly || isSuperAdmin))

  return (
    <div className="form-bg min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-3xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#6366f1] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold font-sans text-gray-400 uppercase tracking-wide">
              {isSuperAdmin ? 'Super Admin' : isViewer ? 'Admin Regional' : 'Admin'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300 font-sans hidden sm:block">{session?.nome}</span>
            <LogoutButton />
          </div>
        </div>

        {/* Título */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#6366f1] mb-5">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <Text as="h1" variant="heading-lg" className="text-dark mb-2 block">
            Painel de Administração
          </Text>
          <Text variant="body-md" className="text-gray-300">
            {isSuperAdmin
              ? 'Gerencie o sistema, unidades e usuários'
              : isViewer
                ? 'Gerencie usuários e monitore as unidades vinculadas'
                : 'Gerencie usuários e monitore sua unidade'}
          </Text>
        </div>

        {/* Setores (Administrativo, Patrimônio, Higienização e Limpeza) */}
        <AdminCardGrid items={modules} />

      </div>
    </div>
  )
}
