import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Text from '@/components/ui/Text'
import { getSession } from '@/lib/auth'
import LogoutButton from '@/components/ui/LogoutButton'
import AdminCardGrid from '../../_components/AdminCardGrid'
import { getModule, type AdminModule } from '../../_modules'

// Telas de um setor. O acesso ao /admin em si é garantido pelo layout pai
// (super_admin, tenant_admin, viewer); aqui só se filtra o que é superAdminOnly.

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function AdminModulePage({ params }: PageProps) {
  const { slug } = await params
  const session = await getSession()
  const isSuperAdmin = session?.role === 'super_admin'

  const mod = getModule(slug as AdminModule['slug'])
  if (!mod) notFound()
  if (mod.superAdminOnly && !isSuperAdmin) notFound()

  const actions = mod.actions.filter((a) => !a.superAdminOnly || isSuperAdmin)
  if (actions.length === 0) notFound()

  const Icon = mod.icon

  return (
    <div className="form-bg min-h-screen flex flex-col items-center p-6">
      <div className="w-full max-w-3xl">

        {/* Voltar + Logout */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-dark font-sans transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Painel Admin
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300 font-sans hidden sm:block">{session?.nome}</span>
            <LogoutButton />
          </div>
        </div>

        {/* Título do módulo */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ backgroundColor: mod.color }}
          >
            <Icon className="w-8 h-8 text-white" />
          </div>
          <Text as="h1" variant="heading-lg" className="text-dark mb-2 block">
            {mod.title}
          </Text>
          <Text variant="body-md" className="text-gray-300">
            {mod.description}
          </Text>
        </div>

        {/* Telas do setor */}
        <AdminCardGrid items={actions} />

      </div>
    </div>
  )
}
