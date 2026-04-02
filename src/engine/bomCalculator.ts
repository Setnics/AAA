/**
 * SEITE — BOM Calculation Engine
 *
 * Pure business logic — ZERO UI or framework dependencies.
 * Implements the formulas defined in SRS §4.2.
 *
 * Cantidad(M) = CEIL( Σ [CoeF(M, tipo_TC_k, montaje_k, perfil) × N_TC_k] )
 *
 * FIX #5: Los materiales sin enlace de referencia ya no se valúan silenciosamente
 *         en $0. Ahora se usa siempre precioUnitario y se agrega una advertencia
 *         cuando falta el enlace, para que el usuario sepa que debe verificarlo.
 *
 * FIX #9: El porcentaje de mano de obra ya no está hardcodeado al 40%.
 *         Ahora se lee de project.porcentajeManoObra con fallback al 40%.
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

// ─── Link Validation ────────────────────────────────────

function hasValidReferenceLink(material: Material): boolean {
  const link = (material.enlaceReferencia || '').trim().toLowerCase();
  return link.startsWith('http') || link.startsWith('www');
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

  // FIX #9: porcentaje de mano de obra configurable por proyecto (default 40%)
  const laborPct = project.porcentajeManoObra ?? 40;

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
      warnings.push(`Material [${materialCodigo}] no encontrado en el catálogo.`);
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

    // FIX #5: Se usa SIEMPRE el precio del material, sin condicionar al enlace.
    // Si falta el enlace, se genera una advertencia pero el precio no se zerifica.
    if (!hasValidReferenceLink(material)) {
      warnings.push(
        `Material [${material.codigo}] no tiene enlace de referencia verificado. ` +
        `Se usa el precio registrado (${material.precioUnitario} ${material.monedaCatalogo}), ` +
        `pero se recomienda verificarlo.`
      );
    }

    const cantidadEstimada = applyRounding(qtyWithWastage, material.unidad);
    const existing = existingByMaterialId.get(material.id);
    const hasManualAdjustment = existing && existing.cantidadAjustada !== existing.cantidadEstimada;

    let precioUnitarioSnap = material.precioUnitario;
    if (material.monedaCatalogo === 'USD' && project.moneda === 'CRC') {
      precioUnitarioSnap = material.precioUnitario * (project.tipoCambio || 500);
    } else if (material.monedaCatalogo === 'CRC' && project.moneda === 'USD') {
      precioUnitarioSnap = material.precioUnitario / (project.tipoCambio || 500);
    }

    const entry: BOMEntry = {
      id: existing?.id ?? uuidv4(),
      proyectoId: projectId,
      materialId: material.id,
      cantidadEstimada,
      cantidadAjustada: hasManualAdjustment ? existing.cantidadAjustada : cantidadEstimada,
      precioUnitarioSnap,
      ultimaActualizacion: now,
    };

    entries.push(entry);
    totalMaterialCost += entry.cantidadAjustada * entry.precioUnitarioSnap;
  }

  const laborMonto = totalMaterialCost * (laborPct / 100);
  const contingencyMonto = (totalMaterialCost + laborMonto) * (contingency / 100);

  return {
    entries,
    warnings,
    laborEntry: {
      descripcion: `Estimación de Mano de Obra (${laborPct}%)`,
      monto: laborMonto,
    },
    contingencyEntry: {
      descripcion: `Margen de Contingencia (${contingency}%)`,
      monto: contingencyMonto,
    },
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
