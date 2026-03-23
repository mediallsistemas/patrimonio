'use client'

import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/header'
import CheckFeedback from '@/components/ui/CheckFeedback'
import { useOcorrenciaRondaTenant } from '@/hooks/useOcorrenciaRondaTenant'
import DraftBanner from './components/DraftBanner'
import TelaInicio from './components/TelaInicio'
import BarraProgresso from './components/BarraProgresso'
import BlocoIntro from './components/BlocoIntro'
import OcorrenciaPergunta from './components/OcorrenciaPergunta'
import OcorrenciaDetalhe from './components/OcorrenciaDetalhe'
import TrilogoCard from './components/TrilogoCard'
import BlocoResumo from './components/BlocoResumo'
import ResumoFinal from './components/ResumoFinal'

export default function OcorrenciasPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const ronda = useOcorrenciaRondaTenant()
  const { etapa } = ronda

  return (
    <div className="form-bg min-h-screen flex flex-col">
      <CheckFeedback show={ronda.showOverlay} variant="card" />
      <Header title="Registro de Ocorrências" backHref={`/${tenantSlug}/manutencao`} />

      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-lg space-y-4">

          {/* Barra de progresso (exceto inicio e resumo_final) */}
          {etapa !== 'inicio' && etapa !== 'resumo_final' && (
            <BarraProgresso
              blocoIdx={ronda.blocoIdx}
              totalBlocos={ronda.totalBlocos}
              progressoPct={ronda.progressoPct}
              blocoAtual={ronda.blocoAtual}
              concluidos={ronda.concluidos}
            />
          )}

          {/* Draft banner */}
          {etapa === 'inicio' && ronda.draftCarregado && ronda.draft && (
            <DraftBanner
              draft={ronda.draft}
              handleContinuarDraft={ronda.handleContinuarDraft}
              handleCancelarDraft={ronda.handleCancelarDraft}
            />
          )}

          {/* Tela inicial */}
          {etapa === 'inicio' && (
            <TelaInicio
              tenantSlug={tenantSlug}
              submitting={ronda.submitting}
              handleIniciar={ronda.handleIniciar}
            />
          )}

          {etapa === 'bloco_intro' && (
            <BlocoIntro
              blocoIdx={ronda.blocoIdx}
              setEtapa={ronda.setEtapa}
              setBlocoIdx={ronda.setBlocoIdx}
            />
          )}

          {etapa === 'ocorrencia_pergunta' && (
            <OcorrenciaPergunta
              blocoIdx={ronda.blocoIdx}
              ambienteIdx={ronda.ambienteIdx}
              ambienteAtual={ronda.ambienteAtual}
              concluidosBloco={ronda.concluidosBloco}
              submitting={ronda.submitting}
              handleSemOcorrencia={ronda.handleSemOcorrencia}
              setEtapa={ronda.setEtapa}
            />
          )}

          {etapa === 'ocorrencia_detalhe' && (
            <OcorrenciaDetalhe
              blocoIdx={ronda.blocoIdx}
              ambienteAtual={ronda.ambienteAtual}
              detalhe={ronda.detalhe}
              errors={ronda.errors}
              fileInputRef={ronda.fileInputRef}
              setDetalhe={ronda.setDetalhe}
              setErrors={ronda.setErrors}
              setEtapa={ronda.setEtapa}
              handleDetalheNext={ronda.handleDetalheNext}
              handleFoto={ronda.handleFoto}
            />
          )}

          {etapa === 'trilogo' && (
            <TrilogoCard
              blocoIdx={ronda.blocoIdx}
              ambienteAtual={ronda.ambienteAtual}
              submitting={ronda.submitting}
              handleTrilogo={ronda.handleTrilogo}
              setEtapa={ronda.setEtapa}
            />
          )}

          {etapa === 'bloco_resumo' && (
            <BlocoResumo
              blocoIdx={ronda.blocoIdx}
              concluidosBloco={ronda.concluidosBloco}
              isUltimoBloco={ronda.isUltimoBloco}
              handleProximoBloco={ronda.handleProximoBloco}
              handleVoltarBloco={ronda.handleVoltarBloco}
            />
          )}

          {etapa === 'resumo_final' && (
            <ResumoFinal
              tenantSlug={tenantSlug}
              concluidos={ronda.concluidos}
              onNovaRonda={() => {
                ronda.setEtapa('inicio')
              }}
            />
          )}

        </div>
      </main>
    </div>
  )
}
