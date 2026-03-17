'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle, Camera } from 'lucide-react'
import { TbFaceId } from 'react-icons/tb'
import toast from 'react-hot-toast'
import CameraView from '@/components/camera-view'
import Button from '@/components/button'
import Card from '@/components/card'
import Text from '@/components/text'
import Input from '@/components/input'
import Header from '@/components/header'
import { api } from '@/services/api'
import { validarCPF, formatarCPF } from '@/utils/format'

export default function CadastroPage() {
  const router = useRouter()
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null)
  const [capturando, setCapturando] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ nome?: string; cpf?: string; face?: string }>({})

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11)
    setCpf(raw)
    if (errors.cpf) setErrors((p) => ({ ...p, cpf: undefined }))
  }

  function handleDescriptor(descriptor: number[]) {
    setFaceDescriptor(descriptor)
    setCapturando(false)
    setErrors((p) => ({ ...p, face: undefined }))
    toast.success('Face capturada com sucesso!')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: typeof errors = {}
    if (!nome.trim()) newErrors.nome = 'Nome é obrigatório'
    if (!validarCPF(cpf)) newErrors.cpf = 'CPF inválido'
    if (!faceDescriptor) newErrors.face = 'Capture seu rosto antes de cadastrar'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setSubmitting(true)
    try {
      await api.post(`hotelaria/${tenantSlug}/pessoas`, { nome: nome.trim(), cpf, faceDescriptor })
      toast.success('Cadastro realizado com sucesso!')
      router.push(`/${tenantSlug}/hotelaria`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar cadastro')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="form-bg min-h-screen flex flex-col">
      <Header title="Criar Cadastro" />
      <main className="flex-1 flex items-start justify-center px-6 py-6">
        <div className="w-full max-w-lg">
          <Card shadow="md">
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Nome completo"
                value={nome}
                onChange={(e) => { setNome(e.target.value); if (errors.nome) setErrors((p) => ({ ...p, nome: undefined })) }}
                placeholder="Digite o nome completo"
                error={errors.nome}
              />
              <Input
                label="CPF"
                value={formatarCPF(cpf)}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                error={errors.cpf}
                inputMode="numeric"
              />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TbFaceId className="w-5 h-5 text-blue-500" />
                  <Text variant="body-sm-bold" className="text-dark block">Foto / Face ID</Text>
                </div>

                {faceDescriptor ? (
                  <div className="flex items-center gap-3 p-4 bg-green-light rounded-xl border border-gray-200">
                    <CheckCircle className="w-5 h-5 text-green-base shrink-0" />
                    <Text variant="body-sm" className="text-green-dark flex-1">Face capturada com sucesso</Text>
                    <button type="button" onClick={() => { setFaceDescriptor(null); setCapturando(false) }} className="text-xs text-gray-300 hover:text-dark font-sans underline">
                      Recapturar
                    </button>
                  </div>
                ) : capturando ? (
                  <div className="space-y-3">
                    <CameraView capturing={true} onDescriptor={handleDescriptor} onError={(err) => { toast.error(err); setCapturando(false) }} label="Posicione seu rosto e aguarde..." />
                    <Button type="button" variant="outline" onClick={() => setCapturando(false)} className="w-full">Cancelar captura</Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setCapturando(true)} className="w-full">
                    <Camera className="w-4 h-4" /> Capturar Face
                  </Button>
                )}

                {errors.face && <Text variant="caption" className="text-red-base block">{errors.face}</Text>}
              </div>

              <Button type="submit" disabled={submitting} className="w-full" size="lg">
                {submitting ? 'Cadastrando...' : 'Criar Cadastro'}
              </Button>
            </form>
          </Card>
        </div>
      </main>
    </div>
  )
}
