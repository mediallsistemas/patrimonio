import { redirect } from 'next/navigation'

export default async function OcorrenciasRedirect({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  redirect(`/${tenantSlug}/manutencao/ocorrencias`)
}
