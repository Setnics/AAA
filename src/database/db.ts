/**
 * SEITE — Dexie.js Database Instance
 *
 * IndexedDB wrapper with all tables defined per SRS §3.1.
 * This is the single source of truth for offline data persistence.
 */

import Dexie, { type Table } from 'dexie';
import type {
  Project,
  Zone,
  Circuit,
  OutletGroup,
  Material,
  BOMEntry,
  Adjustment,
  Snapshot,
  OfertaMaterial,
} from './schema';

export class SeiteDatabase extends Dexie {
  projects!: Table<Project, string>;
  zones!: Table<Zone, string>;
  circuits!: Table<Circuit, string>;
  outlets!: Table<OutletGroup, string>;
  materials!: Table<Material, string>;
  bomEntries!: Table<BOMEntry, string>;
  adjustments!: Table<Adjustment, string>;
  snapshots!: Table<Snapshot, string>;

  ofertas!: Table<OfertaMaterial, string>;

  constructor() {
    super('SeiteDB');

    this.version(1).stores({
      projects: 'id, nombre, estado, creadoPor, modificadoEn',
      zones: 'id, proyectoId, orden',
      circuits: 'id, zonaId',
      outlets: 'id, circuitoId, tipo',
      materials: 'id, codigo, categoria, activo',
      bomEntries: 'id, proyectoId, materialId',
      adjustments: 'id, bomId, timestamp',
      snapshots: 'id, proyectoId, numeroVersion',
    });

    this.version(2).stores({
      ofertas: 'id, codigo, categoria, proveedor',
    });
  }
}

export const db = new SeiteDatabase();
