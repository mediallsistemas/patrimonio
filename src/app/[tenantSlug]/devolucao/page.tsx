'use client'

import { useState, useCallback } from 'react'
import { CheckCircle, XCircle, PackageCheck, AlertCircle } from 'lucide-react'
import { GiClothes } from 'react-icons/gi'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import CameraView from '@/components/camera-view'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Text from '@/components/ui/Text'
import Header from '@/components/ui/Header'
import { api } from '@/services/api'
import type { VerificarFaceResponse } from '@/types'

type Estado = 'camera' | 'verificando' | 'com_pendentes' | 'sem_pendentes' | 'nao_encontrado' | 'sucesso'

export default function DevolucaoPage() {
  const router = useRouter()
  const params = useParams<{ tenantSlug: string }>()
  const tenantSlug = params.tenantSlug
  const [estado, setEstado] = useState<Estado>('camera')
  const [pessoa, setPessoa] = useState<VerificarFaceResponse['pessoa'] | null>(null)
  const [pendentes, setPendentes] = useState(0)
  const [confirmando, setConfirmando] = useState(false)

  const handleDescriptor = useCallback(
    async (descriptor: number[]) => {
      if (estado !== 'camera') return
      setEstado('verificando')

      try {
        const res = await api.post<VerificarFaceResponse>(`hotelaria/${tenantSlug}/verificar-face`, { descriptor })
        if (res.encontrado && res.pessoa) {
          setPessoa(res.pessoa)
          const qtd = res.pendentes ?? 0
          setPendentes(qtd)
          setEstado(qtd > 0 ? 'com_pendentes' : 'sem_pendentes')
        } else {
          setEstado('nao_encontrado')
        }
      } catch {
        toast.error('Erro ao verificar rosto. Tente novamente.')
        setEstado('camera')
      }
    },
    [estado],
  )

  async function confirmarDevolucao() {
    if (!pessoa) return
    setConfirmando(true)
    try {
      await api.post('movimentacoes', { pessoaId: pessoa.id, tipo: 'devolucao' })
      setEstado('sucesso')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar devolução')
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <div className="form-bg min-h-screen flex flex-col">
      <Header title="Devolução de Roupa" backHref={`/${tenantSlug}`} />

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-4">

          {(estado === 'camera' || estado === 'verificando') && (
            <Card shadow="md" padding="md">
              <CameraView
                capturing={estado === 'camera'}
                onDescriptor={handleDescriptor}
                onError={(err) => toast.error(err)}
                label="Posicione seu rosto para identificação..."
              />
              {estado === 'verificando' && (
                <div className="mt-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-base animate-bounce" />
                    <Text variant="body-md" className="text-gray-300">
                      Verificando identidade...
                    </Text>
                  </div>
                </div>
              )}
            </Card>
          )}

          {estado === 'com_pendentes' && pessoa && (
            <Card shadow="md" padding="lg">
              <div className="text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-[#FF7F50] flex items-center justify-center mx-auto">
                  <GiClothes className="w-8 h-8 text-white" />
                </div>
                <div>
                  <Text as="h2" variant="heading-md" className="text-dark block">
                    Olá, {pessoa.nome}!
                  </Text>
                </div>
                <div className="bg-red-light rounded-xl p-4 border border-gray-200">
                  <Text as="p" variant="body-md-bold" className="text-red-dark">
                    {pendentes} {pendentes === 1 ? 'item pendente' : 'itens pendentes'} de devolução
                  </Text>
                </div>
                <Text variant="body-md" className="text-gray-300 block">
                  Deseja confirmar a devolução de 1 item?
                </Text>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setEstado('camera')}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="success"
                    onClick={confirmarDevolucao}
                    disabled={confirmando}
                    className="flex-1"
                  >
                    {confirmando ? 'Registrando...' : 'Confirmar'}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {estado === 'sem_pendentes' && pessoa && (
            <Card shadow="md" padding="lg">
              <div className="text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-yellow-light flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-yellow-base" />
                </div>
                <Text as="h2" variant="heading-sm" className="text-dark block">
                  Olá, {pessoa.nome}!
                </Text>
                <div className="bg-yellow-light rounded-xl p-4 border border-gray-200">
                  <Text as="p" variant="body-md" className="text-yellow-dark">
                    Você não possui retiradas pendentes de devolução.
                  </Text>
                </div>
                <Button onClick={() => router.push(`/${tenantSlug}`)} className="w-full">
                  Voltar ao Menu
                </Button>
              </div>
            </Card>
          )}

          {estado === 'nao_encontrado' && (
            <Card shadow="md" padding="lg">
              <div className="text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-red-light flex items-center justify-center mx-auto">
                  <XCircle className="w-8 h-8 text-red-base" />
                </div>
                <Text as="h2" variant="heading-sm" className="text-dark block">
                  Rosto não reconhecido
                </Text>
                <Text variant="body-md" className="text-gray-300 block">
                  Não foi possível identificar nenhum usuário cadastrado.
                </Text>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setEstado('camera')}
                    className="flex-1"
                  >
                    Tentar novamente
                  </Button>
                  <Button variant="secondary" onClick={() => router.push(`/${tenantSlug}`)} className="flex-1">
                    Voltar
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {estado === 'sucesso' && (
            <Card shadow="md" padding="lg">
              <div className="text-center space-y-5">
                <div className="w-20 h-20 rounded-full bg-[#FF7F50] flex items-center justify-center mx-auto">
                  <GiClothes className="w-10 h-10 text-white" />
                </div>
                <Text as="h2" variant="heading-md" className="text-dark block">
                  Devolução registrada!
                </Text>
                <Text variant="body-md" className="text-gray-300 block">
                  Obrigado, {pessoa?.nome}! A devolução foi confirmada com sucesso.
                </Text>
                <Button onClick={() => router.push(`/${tenantSlug}`)} className="w-full" size="lg">
                  Voltar ao Menu
                </Button>
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}
