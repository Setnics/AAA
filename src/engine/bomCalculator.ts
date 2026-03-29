/**
 * SEITE — BOM Calculation Engine
 *
 * Pure business logic — ZERO UI or framework dependencies.
 * Implements the formulas defined in SRS §4.2.
 *
 * Cantidad(M) = CEIL( Σ [CoeF(M, tipo_TC_k, montaje_k, perfil) × N_TC_k] )
 */

import type {
  OutletGroup,
  Material,
  BOMEntry,
  NormativeProfile,
  CoefficientEntry,
  Circuit,
  BreakerCapacity,
  OutletType,
  MountType,
  Project,
} from '../database/schema';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ──────────────────────────────────────────────

interface BOMInput {
  projectId: string;
  project: Project;
  circuits: Circuit[];
  outlets: OutletGroup[];
  profile: NormativeProfile;
  catalog: Material[];
  existingBOM: BOMEntry[];
}

interface BOMResult {
  entries: BOMEntry[];
  contingencyEntry?: {
    descripcion: string;
    monto: number;
  };
  laborEntry?: {
    descripcion: string;
    monto: number;
  };
  warnings: string[];
}

// ─── Coefficient Lookup ─────────────────────────────────

function findCoefficient(
  coefficients: CoefficientEntry[],
  materialCodigo: string,
  outletType: OutletType,
  mountType: MountType
): number {
  const exactMatch = coefficients.find(
    (c) =>
      c.materialCodigo === materialCodigo &&
      c.outletType === outletType &&
      c.mountType === mountType
  );
  if (exactMatch) return exactMatch.coefficient;

  const allMount = coefficients.find(
    (c) =>
      c.materialCodigo === materialCodigo &&
      c.outletType === outletType &&
      c.mountType === 'ALL'
  );
  if (allMount) return allMount.coefficient;

  return 0;
}

// ─── Breaker Calculation ────────────────────────────────

function calculateBreakers(circuits: Circuit[]): Map<BreakerCapacity, number> {
  const breakerCounts = new Map<BreakerCapacity, number>();
  for (const circuit of circuits) {
    const current = breakerCounts.get(circuit.capacidadBreaker) ?? 0;
    breakerCounts.set(circuit.capacidadBreaker, current + 1);
  }
  return breakerCounts;
}

function getBreakerMaterialCode(capacity: BreakerCapacity): string {
  return `BREAKER-${capacity}A`;
}

// ─── Rounding Rules ─────────────────────────────────────

function applyRounding(value: number, unit: string): number {
  if (unit === 'ML') {
    return Math.ceil(value * 10) / 10;
  }
  return Math.ceil(value);
}

// ─── Main BOM Calculator ────────────────────────────────

export function calculateBOM(input: BOMInput): BOMResult {
  const { projectId, project, circuits, outlets, profile, catalog, existingBOM } = input;
  const warnings: string[] = [];
  const now = new Date().toISOString();

  // Factors (Manual overrides or Profile defaults)
  const cableWastage = project.porcentajeDesperdicioCable ?? (profile.factorDesperdicioCondutor * 100);
  const tubeWastage = project.porcentajeDesperdicioTubo ?? 10;
  const contingency = project.margenContingencia ?? 5;

  // Build lookups
  const existingByMaterialId = new Map<string, BOMEntry>();
  for (const entry of existingBOM) {
    existingByMaterialId.set(entry.materialId, entry);
  }

  const materialByCode = new Map<string, Material>();
  for (const mat of catalog) {
    if (mat.activo) {
      materialByCode.set(mat.codigo, mat);
    }
  }

  const allMaterialCodes = new Set(profile.coeficientes.map((c) => c.materialCodigo));

  // Accumulate raw quantities
  const rawQuantities = new Map<string, number>();
  for (const outlet of outlets) {
    for (const materialCodigo of allMaterialCodes) {
      const coef = findCoefficient(profile.coeficientes, materialCodigo, outlet.tipo, outlet.montaje);
      if (coef <= 0) continue;
      const current = rawQuantities.get(materialCodigo) ?? 0;
      rawQuantities.set(materialCodigo, current + coef * outlet.cantidad);
    }
  }

  // Add breakers
  const breakerCounts = calculateBreakers(circuits);
  for (const [capacity, count] of breakerCounts) {
    const code = getBreakerMaterialCode(capacity);
    rawQuantities.set(code, count);
    allMaterialCodes.add(code);
  }

  // Build BOM entries
  const entries: BOMEntry[] = [];
  let totalMaterialCost = 0;

  for (const [materialCodigo, rawQty] of rawQuantities) {
    if (rawQty <= 0) continue;
    const material = materialByCode.get(materialCodigo);

    let factor = 1.0;
    if (material?.categoria === 'CONDUCTOR') {
      factor = 1 + cableWastage / 100;
    } else if (material?.categoria === 'TUBERIA') {
      factor = 1 + tubeWastage / 100;
    }

    const qtyWithWastage = rawQty * factor;

    if (!material) {
      warnings.push(`Material [${materialCodigo}] no encontrado.`);
      const cantidadEstimada = applyRounding(qtyWithWastage, 'UN');
      entries.push({
        id: uuidv4(),
        proyectoId: projectId,
        materialId: materialCodigo,
        cantidadEstimada,
        cantidadAjustada: cantidadEstimada,
        precioUnitarioSnap: 0,
        ultimaActualizacion: now,
      });
      continue;
    }

    const cantidadEstimada = applyRounding(qtyWithWastage, material.unidad);
    const existing = existingByMaterialId.get(material.id);
    const hasManualAdjustment = existing && existing.cantidadAjustada !== existing.cantidadEstimada;

    const link = (material.enlaceReferencia || '').trim().toLowerCase();
    const hasValidLink = link.startsWith('http') || link.startsWith('www');

    let basePrice = hasValidLink ? material.precioUnitario : 0;

    let precioUnitarioSnap = basePrice;
    if (material.monedaCatalogo === 'USD' && project.moneda === 'CRC') {
      precioUnitarioSnap = basePrice * (project.tipoCambio || 500);
    } else if (material.monedaCatalogo === 'CRC' && project.moneda === 'USD') {
      precioUnitarioSnap = basePrice / (project.tipoCambio || 500);
    }

    const entry: BOMEntry = {
      id: existing?.id ?? uuidv4(),
      proyectoId: projectId,
      materialId: material.id,
      cantidadEstimada,
      cantidadAjustada: hasManualAdjustment ? existing.cantidadAjustada : cantidadEstimada,
      // If project currency changed, we MUST update the snap price to the new base
      precioUnitarioSnap: precioUnitarioSnap,
      ultimaActualizacion: now,
    };

    entries.push(entry);
    totalMaterialCost = totalMaterialCost + (entry.cantidadAjustada * entry.precioUnitarioSnap);
  }

  const laborMonto = totalMaterialCost * 0.4;
  const contingencyMonto = (totalMaterialCost + laborMonto) * (contingency / 100);

  return {
    entries,
    warnings,
    laborEntry: { descripcion: 'Estimación de Mano de Obra (40%)', monto: laborMonto },
    contingencyEntry: { descripcion: `Margen de Contingencia (${contingency}%)`, monto: contingencyMonto },
  };
}

// ─── BOM Total Calculations ─────────────────────────────

export function calculateBOMSubtotal(entries: BOMEntry[]): number {
  return entries.reduce(
    (sum, entry) => sum + entry.cantidadAjustada * entry.precioUnitarioSnap,
    0
  );
}

export function calculateBOMTotal(
  entries: BOMEntry[],
  taxRate: number
): {
  subtotal: number;
  taxAmount: number;
  total: number;
} {
  const subtotal = calculateBOMSubtotal(entries);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  return { subtotal, taxAmount, total };
}
