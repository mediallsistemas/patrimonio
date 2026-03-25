'use client'

import Header from '@/components/ui/Header'
import { useRonda } from '@/hooks/useRonda'
import DraftBanner from './components/DraftBanner'
import TelaInicial from './components/TelaInicial'
import BarraProgresso from './components/BarraProgresso'
import ListaAmbientes from './components/ListaAmbientes'
import ConfirmarAbandono from './components/ConfirmarAbandono'
import GasesMedicoes from './components/GasesMedicoes'
import GasesBackup from './components/GasesBackup'
import GasesAbastecimento from './components/GasesAbastecimento'
import GasesAbastecimentoDetalhe from './components/GasesAbastecimentoDetalhe'
import OcorrenciaPergunta from './components/OcorrenciaPergunta'
import OcorrenciaDetalhe from './components/OcorrenciaDetalhe'
import TrilogoCard from './components/TrilogoCard'

export default function RondaPage() {
  const r = useRonda()

  return (
    <div className="form-bg min-h-screen flex flex-col">
      <Header title="Ronda" backHref={`/${r.tenantSlug}/hotelaria`} />

      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-lg space-y-4">

          {r.mostrandoBannerDraft && r.draftServidor && (
            <DraftBanner draft={r.draftServidor} onRetomar={r.retomar} onDescartar={r.descartar} />
          )}

          {!r.iniciada && !r.mostrandoBannerDraft && (
            <TelaInicial
              tenantSlug={r.tenantSlug}
              totalAmbientes={r.totalAmbientes}
              loadingAmbientes={r.loadingAmbientes}
              onIniciar={r.iniciar}
            />
          )}

          {r.iniciada && (
            <>
              <BarraProgresso totalFeitos={r.totalFeitos} totalAmbientes={r.totalAmbientes} progresso={r.progresso} />

              {r.estado.etapa === 'selecao' && (
                <ListaAmbientes
                  ambientesFiltrados={r.ambientesFiltrados}
                  registros={r.estado.registros}
                  search={r.search}
                  setSearch={r.setSearch}
                  tudoFeito={r.tudoFeito}
                  totalAmbientes={r.totalAmbientes}
                  totalFeitos={r.totalFeitos}
                  submitting={r.submitting}
                  onSelecionar={r.selecionarAmbiente}
                  onFinalizar={r.finalizar}
                  onPausar={() => r.atualizar({ etapa: 'confirmar_abandono' })}
                />
              )}

              {r.estado.etapa === 'confirmar_abandono' && (
                <ConfirmarAbandono
                  onAbandonar={r.abandonar}
                  onContinuar={() => r.atualizar({ etapa: 'selecao' })}
                />
              )}

              {r.estado.etapa === 'gases_medicoes' && r.estado.ambienteSelecionado && (
                <GasesMedicoes
                  nomeAmbiente={r.estado.ambienteSelecionado.nome}
                  medicoes={r.estado.medicoes}
                  errors={r.errors}
                  onChangeMedicoes={(medicoes) => r.atualizar({ medicoes })}
                  onVoltar={() => r.atualizar({ etapa: 'selecao', ambienteSelecionado: null })}
                  onContinuar={() => {
                    const e = r.validarMedicoes()
                    if (Object.keys(e).length > 0) { r.setErrors(e); return }
                    r.atualizar({ etapa: 'gases_backup' })
                  }}
                />
              )}

              {r.estado.etapa === 'gases_backup' && r.estado.ambienteSelecionado && (
                <GasesBackup
                  nomeAmbiente={r.estado.ambienteSelecionado.nome}
                  medicoes={r.estado.medicoes}
                  onSim={() => r.atualizar({ backupLigado: true, etapa: 'gases_abastecimento' })}
                  onNao={() => r.atualizar({ backupLigado: false, etapa: 'gases_abastecimento' })}
                  onVoltar={() => r.atualizar({ etapa: 'gases_medicoes' })}
                />
              )}

              {r.estado.etapa === 'gases_abastecimento' && r.estado.ambienteSelecionado && (
                <GasesAbastecimento
                  nomeAmbiente={r.estado.ambienteSelecionado.nome}
                  onSim={() => r.atualizar({ etapa: 'gases_abastecimento_detalhe' })}
                  onNao={() => r.atualizar({ abastecimento: { quantidade: '', tamanho: null }, etapa: 'ocorrencia_pergunta' })}
                  onVoltar={() => r.atualizar({ etapa: 'gases_backup' })}
                />
              )}

              {r.estado.etapa === 'gases_abastecimento_detalhe' && (
                <GasesAbastecimentoDetalhe
                  abastecimento={r.estado.abastecimento}
                  errors={r.errors}
                  onChange={(abastecimento) => r.atualizar({ abastecimento })}
                  onVoltar={() => r.atualizar({ etapa: 'gases_abastecimento' })}
                  onContinuar={() => {
                    const e = r.validarAbastecimento()
                    if (Object.keys(e).length > 0) { r.setErrors(e); return }
                    r.atualizar({ etapa: 'ocorrencia_pergunta' })
                  }}
                />
              )}

              {r.estado.etapa === 'ocorrencia_pergunta' && r.estado.ambienteSelecionado && (
                <OcorrenciaPergunta
                  nomeAmbiente={r.estado.ambienteSelecionado.nome}
                  tipoAmbiente={r.estado.ambienteSelecionado.tipo}
                  submitting={r.submitting}
                  onNormal={() => r.salvarAmbiente(false)}
                  onOcorrencia={() => r.atualizar({ etapa: 'ocorrencia_detalhe' })}
                  onVoltar={() => r.atualizar({
                    etapa: r.estado.ambienteSelecionado?.tipo === 'gases' ? 'gases_abastecimento' : 'selecao',
                    ambienteSelecionado: r.estado.ambienteSelecionado?.tipo === 'gases' ? r.estado.ambienteSelecionado : null,
                  })}
                />
              )}

              {r.estado.etapa === 'ocorrencia_detalhe' && r.estado.ambienteSelecionado && (
                <OcorrenciaDetalhe
                  nomeAmbiente={r.estado.ambienteSelecionado.nome}
                  ocorrencia={r.estado.ocorrencia}
                  errors={r.errors}
                  onChange={(ocorrencia) => r.atualizar({ ocorrencia: { ...ocorrencia, trilogoChamado: r.estado.ocorrencia.trilogoChamado } })}
                  onVoltar={() => r.atualizar({ etapa: 'ocorrencia_pergunta' })}
                  onContinuar={() => {
                    const e = r.validarDetalheOcorrencia()
                    if (Object.keys(e).length > 0) { r.setErrors(e); return }
                    r.atualizar({ etapa: 'trilogo' })
                  }}
                />
              )}

              {r.estado.etapa === 'trilogo' && r.estado.ambienteSelecionado && (
                <TrilogoCard
                  nomeAmbiente={r.estado.ambienteSelecionado.nome}
                  submitting={r.submitting}
                  onSim={() => r.salvarAmbiente(true, true)}
                  onNao={() => r.salvarAmbiente(true, false)}
                  onVoltar={() => r.atualizar({ etapa: 'ocorrencia_detalhe' })}
                />
              )}
            </>
          )}

        </div>
      </main>
    </div>
  )
}
