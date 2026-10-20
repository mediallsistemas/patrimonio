import { describe, expect, it } from 'vitest'
import { fotosMedicoesParaGravar } from './rondas.rules'
import { RegistroAmbienteSchema, type RegistroAmbienteInput } from './rondas.types'

const FOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ'

function gases(extra: Record<string, unknown> = {}): RegistroAmbienteInput {
  return RegistroAmbienteSchema.parse({
    tipoRegistro: 'gases',
    ambiente: 'Usina de O2',
    purezaO2: 93.5,
    pressaoO2: 4.5,
    pressaoAr: 5,
    backupLigado: false,
    temAbastecimento: false,
    temOcorrencia: false,
    ...extra,
  })
}

describe('RegistroAmbienteSchema — fotos do relógio', () => {
  it('aceita registro de gases sem fotos, como antes', () => {
    expect(gases().tipoRegistro).toBe('gases')
  })

  it('aceita foto em qualquer combinação de medições', () => {
    const r = gases({ fotosMedicoes: { purezaO2: FOTO, pressaoO2: null } })
    expect(r.tipoRegistro === 'gases' && r.fotosMedicoes?.purezaO2).toBe(FOTO)
  })

  it('recusa foto acima do teto de ~1.5MB', () => {
    const grande = 'x'.repeat(2_000_001)
    const r = RegistroAmbienteSchema.safeParse({
      tipoRegistro: 'gases', ambiente: 'Usina', purezaO2: 93, pressaoO2: 4, pressaoAr: 5,
      backupLigado: false, temAbastecimento: false, temOcorrencia: false,
      fotosMedicoes: { pressaoAr: grande },
    })
    expect(r.success).toBe(false)
  })
})

describe('fotosMedicoesParaGravar', () => {
  it('grava só as medições que vieram com foto, na ordem fixa', () => {
    const r = gases({ fotosMedicoes: { pressaoAr: FOTO, purezaO2: FOTO, pressaoO2: null } })
    expect(fotosMedicoesParaGravar(r)).toEqual([
      { medicao: 'purezaO2', foto: FOTO },
      { medicao: 'pressaoAr', foto: FOTO },
    ])
  })

  it('não grava nada sem fotos', () => {
    expect(fotosMedicoesParaGravar(gases())).toEqual([])
    expect(fotosMedicoesParaGravar(gases({ fotosMedicoes: {} }))).toEqual([])
  })

  it('ignora fotos em registro de ocorrência', () => {
    const r = RegistroAmbienteSchema.parse({
      tipoRegistro: 'ocorrencia', ambiente: 'Recepção', temOcorrencia: false,
      fotosMedicoes: { purezaO2: FOTO },
    })
    expect(fotosMedicoesParaGravar(r)).toEqual([])
  })
})
