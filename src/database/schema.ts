/**
 * SEITE — Data Model Type Definitions
 * Based on SRS v2.0 §3.1
 *
 * These interfaces are technology-agnostic and used by both
 * the Dexie (IndexedDB) layer and the BOM calculation engine.
 */

// ─── Enums ───────────────────────────────────────────────

export type OutletType =
  | 'ESTANDAR_120'
  | 'DOBLE_120'
  | 'TRIPLE_120'
  | 'ESTANDAR_240'
  | 'GFCI'
  | 'AFCI'
  | 'GFCI_AFCI'
  | 'TR_120'
  | 'WR_120'
  | 'GFCI_TR_120'
  | 'GFCI_WR_120';

export type MountType = 'EMPOTRADO' | 'SUPERFICIAL';

export type ProjectStatus = 'BORRADOR' | 'FINALIZADO' | 'ARCHIVADO';

export type MaterialUnit = 'UN' | 'ML' | 'M' | 'ROLLO' | 'CAJA';

export type MaterialCategory =
  | 'CONDUCTOR'
  | 'CANALETA'
  | 'CAJA'
  | 'ACCESORIO'
  | 'PROTECCION'
  | 'ACABADO'
  | 'TIERRA'
  | 'TUBERIA'
  | 'CONECTOR';

export type BreakerCapacity = 15 | 20 | 30 | 50;

export type ElectrificationLevel = 'BAJO' | 'MEDIO' | 'ALTO';

// ─── Entities ────────────────────────────────────────────

export interface Project {
  id: string;
  nombre: string;
  descripcion: string;
  cliente: string;
  ubicacion: string;
  area: number; // m2
  nivelElectrificacion: ElectrificationLevel;
  perfilNormativoId: string;
  moneda: 'USD' | 'CRC';
  tipoCambio: number; // Tipo de cambio respecto al USD
  tasaImpuesto: number;
  porcentajeDesperdicioCable: number; // Manual override
  porcentajeDesperdicioTubo: number;  // Manual override
  margenContingencia: number;         // Manual override
  estado: ProjectStatus;
  versionActual: number;
  creadoPor: string;
  creadoEn: string;
  modificadoEn: string;
}

export interface Zone {
  id: string;
  proyectoId: string;
  nombre: string;
  descripcion: string;
  orden: number;
}

export interface Circuit {
  id: string;
  zonaId: string;
  nombre: string;
  capacidadBreaker: BreakerCapacity;
  maxTomacorrientes: number;
  asignacionAuto: boolean;
}

export interface OutletGroup {
  id: string;
  circuitoId: string;
  tipo: OutletType;
  montaje: MountType;
  cantidad: number;
  notas: string;
}

export interface Material {
  id: string;
  codigo: string;
  descripcion: string;
  unidad: MaterialUnit;
  precioUnitario: number;
  monedaCatalogo: 'USD' | 'CRC';
  activo: boolean; // para soft-delete
  categoria: MaterialCategory;
  creadoEn: string;
  enlaceReferencia?: string;
}

export interface OfertaMaterial extends Material {
  proveedor?: string;
}

export type ValidProfile = 'NEC-2023' | 'RETIE-2013' | 'NEC-2020-NCR';

export interface BOMEntry {
  id: string;
  proyectoId: string;
  materialId: string;
  cantidadEstimada: number;
  cantidadAjustada: number;
  precioUnitarioSnap: number;
  ultimaActualizacion: string;
}

export interface Adjustment {
  id: string;
  bomId: string;
  usuarioId: string;
  cantidadAnterior: number;
  cantidadNueva: number;
  justificacion: string;
  timestamp: string;
  esRestauracion: boolean;
}

export interface Snapshot {
  id: string;
  proyectoId: string;
  numeroVersion: number;
  etiqueta: string;
  payload: string; // Compressed JSON
  creadoPor: string;
  creadoEn: string;
  esCierreAutomatico: boolean;
}

// ─── Normative Profile ──────────────────────────────────

export interface CoefficientEntry {
  materialCodigo: string;
  outletType: OutletType;
  mountType: MountType | 'ALL';
  coefficient: number;
}

export interface NormativeProfile {
  id: string;
  nombre: string;
  normativa: string;
  maxTomacorrientesPorCircuito20A: number;
  capacidadBreakerDefault: BreakerCapacity;
  factorDesperdicioCondutor: number;
  coefConduitPorTC120: number;
  maxConductoresPorConduit34: number;
  requiereCircuitoPropioTC240: boolean;
  coeficientes: CoefficientEntry[];
}

// ─── Derived / View Models ──────────────────────────────

export interface BOMDisplayRow {
  bomId: string;
  materialId: string;
  materialCodigo: string;
  materialDescripcion: string;
  unidad: MaterialUnit;
  cantidadEstimada: number;
  cantidadAjustada: number;
  diferencia: number;
  precioUnitario: number;
  subtotal: number;
  tieneAjuste: boolean;
  ultimaJustificacion: string;
}

export interface ProjectSummary {
  id: string;
  nombre: string;
  cliente: string;
  estado: ProjectStatus;
  totalZonas: number;
  totalTomacorrientes: number;
  totalEstimado: number;
  modificadoEn: string;
}
