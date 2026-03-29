/**
 * SEITE — Default Materials Catalog Seed Data
 *
 * These materials match the coefficient codes in normativeProfiles.ts.
 * Prices are placeholder values in USD — to be updated by the Admin.
 */

import type { Material, NormativeProfile } from './schema';
import { v4 as uuidv4 } from 'uuid';

const now = new Date().toISOString();

export const DEFAULT_MATERIALS: Material[] = [
  {
    id: uuidv4(),
    codigo: 'TC-UNIT',
    descripcion: 'Tomacorriente Estándar 125V NEMA 5-15R',
    unidad: 'UN',
    precioUnitario: 760,
    monedaCatalogo: 'CRC',
    activo: true,
    categoria: 'ACCESORIO',
    enlaceReferencia: 'https://www.ellagar.com/ECOMMERCE/DetalleArticulo/7010478/toma-corriente-doble-blanco-110-v-empotrar-polar-15a-eagle',
    creadoEn: now,
  },
  {
    id: uuidv4(),
    codigo: 'TC-GFCI',
    descripcion: 'Tomacorriente GFCI 15A (Zonas Húmedas)',
    unidad: 'UN',
    precioUnitario: 18.25,
    monedaCatalogo: 'USD',
    activo: true,
    categoria: 'ACCESORIO',
    creadoEn: now,
  },
  {
    id: uuidv4(),
    codigo: 'TC-TR',
    descripcion: 'Tomacorriente Tamper Resistant (TR) 15A',
    unidad: 'UN',
    precioUnitario: 4.75,
    monedaCatalogo: 'USD',
    activo: true,
    categoria: 'ACCESORIO',
    creadoEn: now,
  },
  {
    id: uuidv4(),
    codigo: 'TC-WR',
    descripcion: 'Tomacorriente Weather Resistant (WR) 15A',
    unidad: 'UN',
    precioUnitario: 6.50,
    monedaCatalogo: 'USD',
    activo: true,
    categoria: 'ACCESORIO',
    creadoEn: now,
  },
  {
    id: uuidv4(),
    codigo: 'CAJA-EMT-STD',
    descripcion: 'Caja rectangular EMT estándar (empotrado)',
    unidad: 'UN',
    precioUnitario: 450,
    monedaCatalogo: 'CRC',
    activo: true,
    categoria: 'CAJA',
    enlaceReferencia: 'https://www.ellagar.com/ECOMMERCE/DetalleArticulo/7006017/caja-rectangular-conduit-ul',
    creadoEn: now,
  },
  {
    id: uuidv4(),
    codigo: 'CAB-12-THHN-F',
    descripcion: 'Conductor AWG 12 THHN Fase (Negro)',
    unidad: 'ML',
    precioUnitario: 365,
    monedaCatalogo: 'CRC',
    activo: true,
    categoria: 'CONDUCTOR',
    enlaceReferencia: 'https://www.ellagar.com/ECOMMERCE/DetalleArticulo/7034045/cable-thhn-12-negro-x-metro-viakon',
    creadoEn: now,
  },
  {
    id: uuidv4(),
    codigo: 'CAB-12-THHN-N',
    descripcion: 'Conductor AWG 12 THHN Neutro (Blanco)',
    unidad: 'ML',
    precioUnitario: 0.85,
    monedaCatalogo: 'USD',
    activo: true,
    categoria: 'CONDUCTOR',
    creadoEn: now,
  },
  {
    id: uuidv4(),
    codigo: 'CAB-12-THHN-T',
    descripcion: 'Conductor AWG 12 THHN Tierra (Verde)',
    unidad: 'ML',
    precioUnitario: 0.65,
    monedaCatalogo: 'USD',
    activo: true,
    categoria: 'CONDUCTOR',
    creadoEn: now,
  },
  {
    id: uuidv4(),
    codigo: 'VARILLA-TIERRA',
    descripcion: 'Varilla Cooperweld 5/8" x 2.4m con conector',
    unidad: 'UN',
    precioUnitario: 24.50,
    monedaCatalogo: 'USD',
    activo: true,
    categoria: 'TIERRA',
    creadoEn: now,
  },
  {
    id: uuidv4(),
    codigo: 'SUPRESOR-SPD',
    descripcion: 'Supresor de Transientes (SPD) Tipo 2',
    unidad: 'UN',
    precioUnitario: 85.00,
    monedaCatalogo: 'USD',
    activo: true,
    categoria: 'PROTECCION',
    creadoEn: now,
  },
  {
    id: uuidv4(),
    codigo: 'BREAKER-AFCI-20A',
    descripcion: 'Breaker AFCI 20A (Protección de arco)',
    unidad: 'UN',
    precioUnitario: 45.00,
    monedaCatalogo: 'USD',
    activo: true,
    categoria: 'PROTECCION',
    creadoEn: now,
  },
  {
    id: uuidv4(),
    codigo: 'CONDUIT-12-EMT',
    descripcion: 'Tubo Conduit EMT Ø1/2" (tramo 3m)',
    unidad: 'ML',
    precioUnitario: 3115 / 3.05, // Precio por metro
    monedaCatalogo: 'CRC',
    activo: true,
    categoria: 'TUBERIA',
    enlaceReferencia: 'https://www.ellagar.com/ECOMMERCE/DetalleArticulo/2018004/tubo-emt-12-12-mm-x-305-m-ul-rymco',
    creadoEn: now,
  },
  {
    id: uuidv4(),
    codigo: 'CONECTOR-12-EMT',
    descripcion: 'Conector EMT Ø1/2"',
    unidad: 'UN',
    precioUnitario: 180,
    monedaCatalogo: 'CRC',
    activo: true,
    categoria: 'CONECTOR',
    enlaceReferencia: 'https://www.ellagar.com/ECOMMERCE/DetalleArticulo/7007862/conector-emt-tornillo-12--12-mm-ul',
    creadoEn: now,
  },
];

export const PROFILE_NCR_NEC2020: NormativeProfile = {
  id: uuidv4(),
  nombre: 'Costa Rica - NEC 2020',
  normativa: 'NEC 2020 / RTCR 458:2011',
  maxTomacorrientesPorCircuito20A: 10, // Regla del 80% (16A / 1.5A per outlet)
  capacidadBreakerDefault: 20,
  factorDesperdicioCondutor: 0.15,
  coefConduitPorTC120: 3, // 3 metros promedio por TC
  maxConductoresPorConduit34: 9,
  requiereCircuitoPropioTC240: true,
  coeficientes: [
    { materialCodigo: 'TC-UNIT', outletType: 'ESTANDAR_120', mountType: 'ALL', coefficient: 1 },
    { materialCodigo: 'TC-GFCI', outletType: 'GFCI', mountType: 'ALL', coefficient: 1 },
    { materialCodigo: 'TC-TR', outletType: 'TR_120', mountType: 'ALL', coefficient: 1 },
    { materialCodigo: 'TC-WR', outletType: 'WR_120', mountType: 'ALL', coefficient: 1 },
    { materialCodigo: 'CAJA-EMT-STD', outletType: 'ESTANDAR_120', mountType: 'EMPOTRADO', coefficient: 1 },
    { materialCodigo: 'CAB-12-THHN-F', outletType: 'ESTANDAR_120', mountType: 'ALL', coefficient: 3.5 },
    { materialCodigo: 'CAB-12-THHN-N', outletType: 'ESTANDAR_120', mountType: 'ALL', coefficient: 3.5 },
    { materialCodigo: 'CAB-12-THHN-T', outletType: 'ESTANDAR_120', mountType: 'ALL', coefficient: 3.5 },
    { materialCodigo: 'CONDUIT-12-EMT', outletType: 'ESTANDAR_120', mountType: 'ALL', coefficient: 3 },
    { materialCodigo: 'CONECTOR-12-EMT', outletType: 'ESTANDAR_120', mountType: 'ALL', coefficient: 2 },
  ],
};

/**
 * Seeds the database with default materials if the catalog is empty or missing new materials.
 */
export async function seedDefaultCatalog(
  materialsTable: { toArray: () => Promise<Material[]>; bulkAdd: (items: Material[]) => Promise<void> }
): Promise<boolean> {
  const existing = await materialsTable.toArray();
  const existingCodes = new Set(existing.map((m) => m.codigo));
  
  const missingMaterials = DEFAULT_MATERIALS.filter((m) => !existingCodes.has(m.codigo));

  if (missingMaterials.length === 0) return false;

  await materialsTable.bulkAdd(missingMaterials);
  return true;
}

/**
 * Forcefully updates the local catalog with master data from DEFAULT_MATERIALS.
 * Useful when master references or prices are updated in the code.
 */
export async function forceUpdateMasterCatalog(
  materialsTable: { 
    put: (item: Material) => Promise<any>;
    toArray: () => Promise<Material[]>;
  }
): Promise<number> {
  let updatedCount = 0;
  for (const master of DEFAULT_MATERIALS) {
    // We use put() to overwrite by ID or add if new. 
    // But since IDs in seedData are random on each run (uuidv4), 
    // we should match by CODE.
    const existing = await materialsTable.toArray();
    const match = existing.find(m => m.codigo === master.codigo);
    
    const itemToSave = {
      ...master,
      id: match?.id ?? master.id // Keep local ID if exists
    };
    
    await materialsTable.put(itemToSave);
    updatedCount++;
  }
  return updatedCount;
}
