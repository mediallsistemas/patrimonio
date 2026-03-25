'use client'

import Header from '@/components/ui/Header'
import { useInspecao } from '@/hooks/useInspecao'
import BarraProgresso from './components/BarraProgresso'
import TelaInicio from './components/TelaInicio'
import Medicoes from './components/Medicoes'
import BackupSistema from './components/BackupSistema'
import AbastecimentoPergunta from './components/AbastecimentoPergunta'
import AbastecimentoDetalhe from './components/AbastecimentoDetalhe'
import AlteracaoPergunta from './components/AlteracaoPergunta'
import AlteracaoDetalhe from './components/AlteracaoDetalhe'
import TrilogoCard from './components/TrilogoCard'
import Resumo from './components/Resumo'

export default function InspecaoPage() {
  const r = useInspecao()

  return (
    <div className="form-bg min-h-screen flex flex-col">
      <Header title="Inspeção de Gases Medicinais" backHref={`/${r.tenantSlug}`} />

      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-lg space-y-4">

          {r.etapa !== 'inicio' && r.etapa !== 'resumo' && (
            <BarraProgresso ambiente={r.ambiente} progressoTotal={r.progressoTotal} />
          )}

          {r.etapa === 'inicio' && (
            <TelaInicio ambiente={r.ambiente} tenantSlug={r.tenantSlug} onIniciar={() => r.setEtapa('medicoes')} />
          )}

          {r.etapa === 'medicoes' && (
            <Medicoes
              ambiente={r.ambiente}
              medicoes={r.medicoes}
              errors={r.errors}
              onChange={r.setMedicoes}
              onClearError={(key) => r.setErrors((e) => ({ ...e, [key]: '' }))}
              onNext={r.handleMedicoesNext}
            />
          )}

          {r.etapa === 'backup' && (
            <BackupSistema
              ambiente={r.ambiente}
              medicoes={r.medicoes}
              onBackup={r.handleBackup}
              onVoltar={() => r.setEtapa('medicoes')}
            />
          )}

          {r.etapa === 'abastecimento_pergunta' && (
            <AbastecimentoPergunta
              ambiente={r.ambiente}
              backupLigado={r.backupLigado}
              onSim={() => r.setEtapa('abastecimento_detalhe')}
              onNao={() => { r.setAbastecimento({ quantidade: '', tamanho: null }); r.setEtapa('alteracao_pergunta') }}
              onVoltar={() => r.setEtapa('backup')}
            />
          )}

          {r.etapa === 'abastecimento_detalhe' && (
            <AbastecimentoDetalhe
              ambiente={r.ambiente}
              abastecimento={r.abastecimento}
              errors={r.errors}
              onChange={r.setAbastecimento}
              onClearError={(key) => r.setErrors((e) => ({ ...e, [key]: '' }))}
              onVoltar={() => r.setEtapa('abastecimento_pergunta')}
              onNext={r.handleAbastecimentoNext}
            />
          )}

          {r.etapa === 'alteracao_pergunta' && (
            <AlteracaoPergunta
              ambiente={r.ambiente}
              medicoes={r.medicoes}
              backupLigado={r.backupLigado}
              abastecimento={r.abastecimento}
              submitting={r.submitting}
              onNao={r.handleSemAlteracao}
              onSim={() => r.setEtapa('alteracao_detalhe')}
              onVoltar={() => r.setEtapa('abastecimento_pergunta')}
            />
          )}

          {r.etapa === 'alteracao_detalhe' && (
            <AlteracaoDetalhe
              ambiente={r.ambiente}
              detalhe={r.detalhe}
              errors={r.errors}
              onChange={r.setDetalhe}
              onClearError={(key) => r.setErrors((e) => ({ ...e, [key]: '' }))}
              fileInputRef={r.fileInputRef}
              onFoto={r.handleFoto}
              onVoltar={() => r.setEtapa('alteracao_pergunta')}
              onNext={r.handleDetalheNext}
            />
          )}

          {r.etapa === 'trilogo' && (
            <TrilogoCard
              ambiente={r.ambiente}
              submitting={r.submitting}
              onTrilogo={r.handleTrilogo}
              onVoltar={() => r.setEtapa('alteracao_detalhe')}
            />
          )}

          {r.etapa === 'resumo' && r.resumo && (
            <Resumo
              ambiente={r.ambiente}
              tenantSlug={r.tenantSlug}
              resumo={r.resumo}
              onNovaInspecao={r.resetForm}
              onHistorico={() => r.router.push(`/${r.tenantSlug}/inspecao/historico`)}
              onVoltar={() => r.router.push(`/${r.tenantSlug}`)}
            />
          )}

        </div>
      </main>
    </div>
  )
}
