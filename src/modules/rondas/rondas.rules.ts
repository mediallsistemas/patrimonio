import { MEDICOES_GAS, type MedicaoGas, type RegistroAmbienteInput } from './rondas.types'

/**
 * Fotos de relógio que acompanham o registro: só as medições que vieram com
 * foto, na ordem de MEDICOES_GAS. Registro de ocorrência não tem medição.
 */
export function fotosMedicoesParaGravar(
  input: RegistroAmbienteInput,
): { medicao: MedicaoGas; foto: string }[] {
  if (input.tipoRegistro !== 'gases' || !input.fotosMedicoes) return []
  const fotos = input.fotosMedicoes
  return MEDICOES_GAS.flatMap((medicao) => {
    const foto = fotos[medicao]
    return foto ? [{ medicao, foto }] : []
  })
}
