'use client'

import Header from '@/components/header'
import CheckFeedback from '@/components/ui/CheckFeedback'
import { useOcorrenciaRonda } from '@/hooks/useOcorrenciaRonda'
import DraftBanner from './components/DraftBanner'
import TelaInicial from './components/TelaInicial'
import BarraProgresso from './components/BarraProgresso'
import ListaBlocos from './components/ListaBlocos'
import ListaLocais from './components/ListaLocais'
import BloCoConcluido from './components/BloCoConcluido'
import ConfirmarAbandono from './components/ConfirmarAbandono'
import OcorrenciaPergunta from './components/OcorrenciaPergunta'
import OcorrenciaDetalhe from './components/OcorrenciaDetalhe'
import TrilogoCard from './components/TrilogoCard'
import GasesMedicoes from './components/GasesMedicoes'
import GasesBackup from './components/GasesBackup'
import GasesAbastecimento from './components/GasesAbastecimento'
import GasesAbastecimentoDetalhe from './components/GasesAbastecimentoDetalhe'
import ResumoFinal from './components/ResumoFinal'
import { BLOCOS } from './types'

export default function OcorrenciasPage() {
  const ronda = useOcorrenciaRonda()
  const { estado, rondaIniciada } = ronda

  return (
    <div className="form-bg min-h-screen flex flex-col">
      <CheckFeedback show={ronda.showCheck} />
      <Header title="Registro de Ocorrências" />

      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-lg space-y-4">

          {ronda.mostrarBanner && ronda.draftServidor && (
            <DraftBanner
              draftServidor={ronda.draftServidor}
              retomar={ronda.retomar}
              descartarDraft={ronda.descartarDraft}
            />
          )}

          {!rondaIniciada && !ronda.mostrarBanner && (
            <TelaInicial
              totalLocais={ronda.totalLocais}
              blocoCount={BLOCOS.length}
              iniciar={ronda.iniciar}
            />
          )}

          {rondaIniciada && (
            <>
              {estado.etapa !== 'resumo_final' && (
                <BarraProgresso
                  totalFeitos={ronda.totalFeitos}
                  totalLocais={ronda.totalLocais}
                  progresso={ronda.progresso}
                />
              )}

              {estado.etapa === 'blocos' && (
                <ListaBlocos
                  blocosFiltrados={ronda.blocosFiltrados}
                  searchBlocos={ronda.searchBlocos}
                  setSearchBlocos={ronda.setSearchBlocos}
                  concluidos={estado.concluidos}
                  submitting={ronda.submitting}
                  totalFeitos={ronda.totalFeitos}
                  totalLocais={ronda.totalLocais}
                  feitosNoBloco={ronda.feitosNoBloco}
                  blocoCompleto={ronda.blocoCompleto}
                  selecionarBloco={ronda.selecionarBloco}
                  finalizarRonda={ronda.finalizarRonda}
                  atualizar={ronda.atualizar}
                />
              )}

              {estado.etapa === 'locais' && ronda.blocoAtual && (
                <ListaLocais
                  blocoAtual={ronda.blocoAtual}
                  locaisFiltrados={ronda.locaisFiltrados}
                  searchLocais={ronda.searchLocais}
                  setSearchLocais={ronda.setSearchLocais}
                  concluidos={estado.concluidos}
                  feitosNoBloco={ronda.feitosNoBloco}
                  localFeito={ronda.localFeito}
                  selecionarLocal={ronda.selecionarLocal}
                  atualizar={ronda.atualizar}
                />
              )}

              {estado.etapa === 'bloco_concluido' && ronda.blocoAtual && (
                <BloCoConcluido
                  blocoAtual={ronda.blocoAtual}
                  concluidos={estado.concluidos}
                  submitting={ronda.submitting}
                  finalizarRonda={ronda.finalizarRonda}
                  atualizar={ronda.atualizar}
                />
              )}

              {estado.etapa === 'confirmar_abandono' && (
                <ConfirmarAbandono abandonar={ronda.abandonar} atualizar={ronda.atualizar} />
              )}

              {estado.etapa === 'ocorrencia_pergunta' && estado.localSelecionado && (
                <OcorrenciaPergunta
                  estado={estado}
                  submitting={ronda.submitting}
                  salvarLocal={ronda.salvarLocal}
                  atualizar={ronda.atualizar}
                />
              )}

              {estado.etapa === 'ocorrencia_detalhe' && estado.localSelecionado && (
                <OcorrenciaDetalhe
                  estado={estado}
                  errors={ronda.errors}
                  fileInputRef={ronda.fileInputRef}
                  atualizar={ronda.atualizar}
                  validarDetalhe={ronda.validarDetalhe}
                  setErrors={ronda.setErrors}
                  handleFoto={ronda.handleFoto}
                />
              )}

              {estado.etapa === 'trilogo' && estado.localSelecionado && (
                <TrilogoCard
                  estado={estado}
                  submitting={ronda.submitting}
                  salvarLocal={ronda.salvarLocal}
                  atualizar={ronda.atualizar}
                />
              )}

              {estado.etapa === 'gases_medicoes' && estado.localSelecionado && (
                <GasesMedicoes
                  estado={estado}
                  errors={ronda.errors}
                  atualizar={ronda.atualizar}
                  validarMedicoes={ronda.validarMedicoes}
                  setErrors={ronda.setErrors}
                />
              )}

              {estado.etapa === 'gases_backup' && (
                <GasesBackup estado={estado} atualizar={ronda.atualizar} />
              )}

              {estado.etapa === 'gases_abastecimento' && (
                <GasesAbastecimento atualizar={ronda.atualizar} />
              )}

              {estado.etapa === 'gases_abastecimento_detalhe' && (
                <GasesAbastecimentoDetalhe
                  estado={estado}
                  errors={ronda.errors}
                  atualizar={ronda.atualizar}
                  validarAbastecimento={ronda.validarAbastecimento}
                  setErrors={ronda.setErrors}
                />
              )}

              {estado.etapa === 'resumo_final' && (
                <ResumoFinal
                  estado={estado}
                  totalFeitos={ronda.totalFeitos}
                  feitosNoBloco={ronda.feitosNoBloco}
                  resetar={ronda.iniciar}
                />
              )}
            </>
          )}

        </div>
      </main>
    </div>
  )
}
