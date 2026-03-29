/**
 * SEITE — Normative Profiles (NEC-2023, RETIE-2013)
 *
 * Predefined coefficient sets per SRS §4.3 and §4.4.
 * These are JSON-structured data, not code — they can be
 * replaced or extended by the Admin without recompilation.
 */

import type { NormativeProfile, CoefficientEntry, OutletType } from './schema';

// ─── Helper to generate coefficient entries for all outlet types ──

type OutletCoefs = Partial<Record<OutletType, number>>;

function makeCoefficients(
  materialCodigo: string,
  mountType: 'ALL' | 'EMPOTRADO' | 'SUPERFICIAL',
  coefs: OutletCoefs
): CoefficientEntry[] {
  return Object.entries(coefs).map(([outletType, coefficient]) => ({
    materialCodigo,
    outletType: outletType as OutletType,
    mountType,
    coefficient: coefficient ?? 0,
  }));
}

// ─── Standard outlet types shorthand ─────────────────────

const STD: OutletCoefs = {
  ESTANDAR_120: 1.0,
  DOBLE_120: 1.0,
  TRIPLE_120: 1.0,
  ESTANDAR_240: 1.0,
  GFCI: 1.0,
  AFCI: 1.0,
  GFCI_AFCI: 1.0,
  TR_120: 1.0,
  WR_120: 1.0,
  GFCI_TR_120: 1.0,
  GFCI_WR_120: 1.0,
};

const CABLE_COEF: OutletCoefs = {
  ESTANDAR_120: 3.5,
  DOBLE_120: 3.5,
  TRIPLE_120: 3.5,
  ESTANDAR_240: 3.5,
  GFCI: 3.5,
  AFCI: 3.5,
  GFCI_AFCI: 3.5,
  TR_120: 3.5,
  WR_120: 3.5,
  GFCI_TR_120: 3.5,
  GFCI_WR_120: 3.5,
};

const CONDUIT_120: OutletCoefs = {
  ESTANDAR_120: 3.0,
  DOBLE_120: 3.0,
  TRIPLE_120: 3.0,
  GFCI: 3.0,
  AFCI: 3.0,
  GFCI_AFCI: 3.0,
  ESTANDAR_240: 3.0,
  TR_120: 3.0,
  WR_120: 3.0,
  GFCI_TR_120: 3.0,
  GFCI_WR_120: 3.0,
};

const GRAPA_COEF: OutletCoefs = {
  ...STD,
  ESTANDAR_120: 2.85,
  ESTANDAR_240: 3.3,
};

const WIRENUTS: OutletCoefs = {
  ...STD,
  ESTANDAR_120: 3.0,
  GFCI: 5.0,
};

const TAPE_COEF: OutletCoefs = {
  ...STD,
  ESTANDAR_120: 0.067,
};

// ─── NEC-2023 Profile ────────────────────────────────────

export const NEC_2023: NormativeProfile = {
  id: 'NEC-2023',
  nombre: 'NEC 2023',
  normativa: 'NFPA 70 / NEC 2023',
  maxTomacorrientesPorCircuito20A: 10,
  capacidadBreakerDefault: 20,
  factorDesperdicioCondutor: 0.30,
  coefConduitPorTC120: 0.95,
  maxConductoresPorConduit34: 3,
  requiereCircuitoPropioTC240: true,
  coeficientes: [
    ...makeCoefficients('TC-UNIT', 'ALL', STD),
    ...makeCoefficients('CAJA-EMT-STD', 'EMPOTRADO', STD),
    ...makeCoefficients('CAJA-SUP-STD', 'SUPERFICIAL', STD),
    ...makeCoefficients('PLACA-STD', 'ALL', STD),
    ...makeCoefficients('CAB-12-THHN-F', 'ALL', CABLE_COEF),
    ...makeCoefficients('CAB-12-THHN-N', 'ALL', CABLE_COEF),
    ...makeCoefficients('CAB-12-THHN-T', 'ALL', CABLE_COEF),
    ...makeCoefficients('CONDUIT-34-EMT', 'ALL', CONDUIT_120),
    ...makeCoefficients('CONECTOR-34', 'ALL', { ...STD, ESTANDAR_120: 2.0 }),
    ...makeCoefficients('GRAPA-STD', 'ALL', GRAPA_COEF),
    ...makeCoefficients('TORNILLO-ANC', 'ALL', { ...STD, ESTANDAR_120: 4.0 }),
    ...makeCoefficients('WIRENUTS-STD', 'ALL', WIRENUTS),
    ...makeCoefficients('CINTA-AISL', 'ALL', TAPE_COEF),
  ],
};

// ─── RETIE-2013 Profile ─────────────────────────────────

export const RETIE_2013: NormativeProfile = {
  id: 'RETIE-2013',
  nombre: 'RETIE 2013',
  normativa: 'Reglamento Técnico de Instalaciones Eléctricas (Colombia)',
  maxTomacorrientesPorCircuito20A: 8,
  capacidadBreakerDefault: 20,
  factorDesperdicioCondutor: 0.25,
  coefConduitPorTC120: 1.0,
  maxConductoresPorConduit34: 3,
  requiereCircuitoPropioTC240: true,
  coeficientes: [
    ...makeCoefficients('TC-UNIT', 'ALL', STD),
    ...makeCoefficients('CAJA-EMT-STD', 'EMPOTRADO', STD),
    ...makeCoefficients('CAJA-SUP-STD', 'SUPERFICIAL', STD),
    ...makeCoefficients('PLACA-STD', 'ALL', STD),
    ...makeCoefficients('CAB-12-THHN-F', 'ALL', CABLE_COEF),
    ...makeCoefficients('CAB-12-THHN-N', 'ALL', CABLE_COEF),
    ...makeCoefficients('CAB-12-THHN-T', 'ALL', CABLE_COEF),
    ...makeCoefficients('CONDUIT-34-EMT', 'ALL', CONDUIT_120),
    ...makeCoefficients('CONECTOR-34', 'ALL', { ...STD, ESTANDAR_120: 2.0 }),
    ...makeCoefficients('GRAPA-STD', 'ALL', GRAPA_COEF),
    ...makeCoefficients('TORNILLO-ANC', 'ALL', { ...STD, ESTANDAR_120: 4.0 }),
    ...makeCoefficients('WIRENUTS-STD', 'ALL', WIRENUTS),
    ...makeCoefficients('CINTA-AISL', 'ALL', TAPE_COEF),
  ],
};

export const NEC_2020_NCR: NormativeProfile = {
  id: 'NEC-2020-NCR',
  nombre: 'Costa Rica - NEC 2020',
  normativa: 'NEC 2020 / RTCR 458:2011',
  maxTomacorrientesPorCircuito20A: 10,
  capacidadBreakerDefault: 20,
  factorDesperdicioCondutor: 0.15,
  coefConduitPorTC120: 3.0,
  maxConductoresPorConduit34: 9,
  requiereCircuitoPropioTC240: true,
  coeficientes: [
    ...makeCoefficients('TC-UNIT', 'ALL', STD),
    ...makeCoefficients('TC-GFCI', 'ALL', { GFCI: 1, GFCI_AFCI: 1, GFCI_TR_120: 1, GFCI_WR_120: 1 }),
    ...makeCoefficients('TC-TR', 'ALL', { TR_120: 1, GFCI_TR_120: 1 }),
    ...makeCoefficients('TC-WR', 'ALL', { WR_120: 1, GFCI_WR_120: 1 }),
    ...makeCoefficients('CAJA-EMT-STD', 'EMPOTRADO', STD),
    ...makeCoefficients('CAB-12-THHN-F', 'ALL', CABLE_COEF),
    ...makeCoefficients('CAB-12-THHN-N', 'ALL', CABLE_COEF),
    ...makeCoefficients('CAB-12-THHN-T', 'ALL', CABLE_COEF),
    ...makeCoefficients('CONDUIT-12-EMT', 'ALL', CONDUIT_120),
    ...makeCoefficients('CONECTOR-12-EMT', 'ALL', { ...STD, ESTANDAR_120: 2 }),
  ],
};

export const NORMATIVE_PROFILES: Record<string, NormativeProfile> = {
  'NEC-2020-NCR': NEC_2020_NCR,
  'NEC-2023': NEC_2023,
  'RETIE-2013': RETIE_2013,
};

export function getProfileById(id: string): NormativeProfile | undefined {
  return NORMATIVE_PROFILES[id];
}

export function getAllProfiles(): NormativeProfile[] {
  return Object.values(NORMATIVE_PROFILES);
}
