'use client'

import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle, XCircle, UserPlus } from 'lucide-react'
import { GiClothes } from 'react-icons/gi'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import CameraView from '@/components/camera-view'
import Button from '@/components/button'
import Card from '@/components/card'
import Text from '@/components/text'
import Header from '@/components/header'
import { api } from '@/services/api'
import type { VerificarFaceResponse } from '@/types'

type Estado = 'camera' | 'verificando' | 'encontrado' | 'nao_encontrado' | 'sucesso'

export default function RetiradaPage() {
  const router = useRouter()
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const [estado, setEstado] = useState<Estado>('camera')
  const [pessoa, setPessoa] = useState<VerificarFaceResponse['pessoa'] | null>(null)
  const [confirmando, setConfirmando] = useState(false)

  const handleDescriptor = useCallback(async (descriptor: number[]) => {
    if (estado !== 'camera') return
    setEstado('verificando')
    try {
      const res = await api.post<VerificarFaceResponse>('verificar-face', { descriptor, tenantSlug })
      if (res.encontrado && res.pessoa) {
        setPessoa(res.pessoa)
        setEstado('encontrado')
      } else {
        setEstado('nao_encontrado')
      }
    } catch {
      toast.error('Erro ao verificar rosto. Tente novamente.')
      setEstado('camera')
    }
  }, [estado])

  async function confirmarRetirada() {
    if (!pessoa) return
    setConfirmando(true)
    try {
      await api.post('movimentacoes', { pessoaId: pessoa.id, tipo: 'retirada', tenantSlug })
      setEstado('sucesso')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar retirada')
    } finally {
      setConfirmando(false)
    }
  }

  const now = new Date()
  const dataFormatada = format(now, 'dd/MM/yyyy', { locale: ptBR })
  const horaFormatada = format(now, 'HH:mm')

  return (
    <div className="form-bg min-h-screen flex flex-col">
      <Header title="Retirada de Roupa" />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-4">

          {(estado === 'camera' || estado === 'verificando') && (
            <Card shadow="md" padding="md">
              <CameraView capturing={estado === 'camera'} onDescriptor={handleDescriptor} onError={(err) => toast.error(err)} label="Posicione seu rosto para identificação..." />
              {estado === 'verificando' && (
                <div className="mt-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-base animate-bounce" />
                    <Text variant="body-md" className="text-gray-300">Verificando identidade...</Text>
                  </div>
                </div>
              )}
            </Card>
          )}

          {estado === 'encontrado' && pessoa && (
            <Card shadow="md" padding="lg">
              <div className="text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-[#FF7F50] flex items-center justify-center mx-auto">
                  <GiClothes className="w-8 h-8 text-white" />
                </div>
                <Text as="h2" variant="heading-md" className="text-dark block">Olá, {pessoa.nome}!</Text>
                <div className="bg-gray-50 rounded-xl p-4 text-left border border-gray-200">
                  <Text variant="body-sm" className="text-gray-300 block mb-1">Data de retirada</Text>
                  <Text as="p" variant="body-md-bold" className="text-dark">{dataFormatada} · {horaFormatada}</Text>
                </div>
                <Text variant="body-md" className="text-gray-300 block">Deseja confirmar a retirada?</Text>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setEstado('camera')} className="flex-1">Cancelar</Button>
                  <Button onClick={confirmarRetirada} disabled={confirmando} className="flex-1">
                    {confirmando ? 'Registrando...' : 'Confirmar'}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {estado === 'nao_encontrado' && (
            <Card shadow="md" padding="lg">
              <div className="text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-red-light flex items-center justify-center mx-auto">
                  <XCircle className="w-8 h-8 text-red-base" />
                </div>
                <Text as="h2" variant="heading-sm" className="text-dark block">Rosto não reconhecido</Text>
                <Text variant="body-md" className="text-gray-300 block">Você não está cadastrado no sistema. Deseja criar um cadastro?</Text>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setEstado('camera')} className="flex-1">Tentar novamente</Button>
                  <Link href={`/${tenantSlug}/hotelaria/cadastro`} className="flex-1">
                    <Button variant="success" className="w-full">
                      <UserPlus className="w-4 h-4" /> Cadastrar-se
                    </Button>
                  </Link>
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
                <Text as="h2" variant="heading-md" className="text-dark block">Retirada registrada!</Text>
                <Text variant="body-md" className="text-gray-300 block">Boa, {pessoa?.nome}! Sua retirada foi confirmada com sucesso.</Text>
                <Button onClick={() => router.push(`/${tenantSlug}/hotelaria`)} className="w-full" size="lg">
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
