/**
 * SEITE — Project Store (Zustand)
 *
 * Central state management for the active project context.
 * Handles CRUD operations that persist to Dexie (IndexedDB).
 */

import { create } from 'zustand';
import { db } from '../database/db';
import { calculateBOM, calculateBOMTotal } from '../engine/bomCalculator';
import { getProfileById } from '../database/normativeProfiles';
import type {
  Project,
  Zone,
  Circuit,
  OutletGroup,
  BOMEntry,
  Adjustment,

  BreakerCapacity,
  OutletType,
  MountType,
} from '../database/schema';
import { v4 as uuidv4 } from 'uuid';

// ─── Store State ────────────────────────────────────────

interface ProjectState {
  // Data
  projects: Project[];
  activeProject: Project | null;
  zones: Zone[];
  circuits: Circuit[];
  outlets: OutletGroup[];
  bomEntries: BOMEntry[];
  adjustments: Adjustment[];

  // UI State
  isLoading: boolean;
  error: string | null;
  lastSaved: string | null;

  // Totals
  bomSubtotal: number;
  bomTaxAmount: number;
  bomTotal: number;

  // Actions — Projects
  loadProjects: () => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<Project>;
  loadProject: (id: string) => Promise<void>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  duplicateProject: (id: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  saveProject: () => Promise<void>;

  // Actions — Zones
  addZone: (nombre: string, descripcion?: string) => Promise<Zone>;
  updateZone: (id: string, data: Partial<Zone>) => Promise<void>;
  deleteZone: (id: string) => Promise<void>;

  // Actions — Circuits
  addCircuit: (zonaId: string, nombre?: string) => Promise<Circuit>;
  updateCircuit: (id: string, data: Partial<Circuit>) => Promise<void>;
  deleteCircuit: (id: string) => Promise<void>;

  // Actions — Outlets
  addOutlet: (
    circuitoId: string,
    tipo: OutletType,
    montaje: MountType,
    cantidad: number,
    notas?: string
  ) => Promise<OutletGroup>;
  updateOutlet: (id: string, data: Partial<OutletGroup>) => Promise<void>;
  deleteOutlet: (id: string) => Promise<void>;

  // Actions — BOM
  recalculateBOM: () => Promise<void>;
  adjustBOMEntry: (
    bomId: string,
    newQuantity: number,
    justification: string
  ) => Promise<void>;
  restoreBOMEntry: (bomId: string) => Promise<void>;
  restoreAllBOM: () => Promise<void>;

  // Internal
  clearActiveProject: () => void;
}

// ─── Store Implementation ───────────────────────────────

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProject: null,
  zones: [],
  circuits: [],
  outlets: [],
  bomEntries: [],
  adjustments: [],
  isLoading: false,
  error: null,
  lastSaved: null,
  bomSubtotal: 0,
  bomTaxAmount: 0,
  bomTotal: 0,

  // ── Projects ──

  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await db.projects.toArray();
      set({ projects, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  createProject: async (data) => {
    const now = new Date().toISOString();
    const project: Project = {
      id: uuidv4(),
      nombre: data.nombre ?? 'Nuevo Proyecto',
      descripcion: data.descripcion ?? '',
      cliente: data.cliente ?? '',
      ubicacion: data.ubicacion ?? '',
      area: data.area ?? 0,
      nivelElectrificacion: data.nivelElectrificacion ?? 'BAJO',
      perfilNormativoId: data.perfilNormativoId ?? 'NEC-2020-NCR',
      moneda: (data.moneda as 'USD' | 'CRC') ?? 'USD',
      tipoCambio: data.tipoCambio ?? 500,
      tasaImpuesto: data.tasaImpuesto ?? 0,
      porcentajeDesperdicioCable: data.porcentajeDesperdicioCable ?? 15,
      porcentajeDesperdicioTubo: data.porcentajeDesperdicioTubo ?? 10,
      margenContingencia: data.margenContingencia ?? 5,
      porcentajeManoObra: data.porcentajeManoObra ?? 40,
      estado: 'BORRADOR',
      versionActual: 1,
      creadoPor: 'local-user',
      creadoEn: now,
      modificadoEn: now,
    };

    await db.projects.add(project);
    const projects = await db.projects.toArray();
    set({ projects });
    return project;
  },

  loadProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const project = await db.projects.get(id);
      if (!project) {
        set({ error: 'Proyecto no encontrado', isLoading: false });
        return;
      }

      const zones = await db.zones.where('proyectoId').equals(id).sortBy('orden');
      const zoneIds = zones.map((z) => z.id);

      const circuits = zoneIds.length > 0
        ? await db.circuits.where('zonaId').anyOf(zoneIds).toArray()
        : [];

      const circuitIds = circuits.map((c) => c.id);
      const outlets = circuitIds.length > 0
        ? await db.outlets.where('circuitoId').anyOf(circuitIds).toArray()
        : [];

      const bomEntries = await db.bomEntries.where('proyectoId').equals(id).toArray();
      const bomIds = bomEntries.map((b) => b.id);
      const adjustments = bomIds.length > 0
        ? await db.adjustments.where('bomId').anyOf(bomIds).toArray()
        : [];

      // Calculate totals
      const totals = calculateBOMTotal(bomEntries, project.tasaImpuesto);

      set({
        activeProject: project,
        zones,
        circuits,
        outlets,
        bomEntries,
        adjustments,
        isLoading: false,
        bomSubtotal: totals.subtotal,
        bomTaxAmount: totals.taxAmount,
        bomTotal: totals.total,
      });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  updateProject: async (id, data) => {
    const now = new Date().toISOString();
    await db.projects.update(id, { ...data, modificadoEn: now });
    const project = await db.projects.get(id);
    if (project) {
      set({ activeProject: project });
    }
  },

  duplicateProject: async (id) => {
    const source = await db.projects.get(id);
    if (!source) throw new Error('Proyecto no encontrado');

    const now = new Date().toISOString();
    const newId = uuidv4();
    const newProject: Project = {
      ...source,
      id: newId,
      nombre: `${source.nombre} — Copia`,
      estado: 'BORRADOR',
      versionActual: 1,
      creadoEn: now,
      modificadoEn: now,
    };

    await db.projects.add(newProject);

    // Copy zones, circuits, outlets, BOM
    const zones = await db.zones.where('proyectoId').equals(id).toArray();
    for (const zone of zones) {
      const newZoneId = uuidv4();
      await db.zones.add({ ...zone, id: newZoneId, proyectoId: newId });

      const circuits = await db.circuits.where('zonaId').equals(zone.id).toArray();
      for (const circuit of circuits) {
        const newCircuitId = uuidv4();
        await db.circuits.add({ ...circuit, id: newCircuitId, zonaId: newZoneId });

        const outlets = await db.outlets.where('circuitoId').equals(circuit.id).toArray();
        for (const outlet of outlets) {
          await db.outlets.add({ ...outlet, id: uuidv4(), circuitoId: newCircuitId });
        }
      }
    }

    const bomEntries = await db.bomEntries.where('proyectoId').equals(id).toArray();
    for (const entry of bomEntries) {
      await db.bomEntries.add({ ...entry, id: uuidv4(), proyectoId: newId });
    }

    const projects = await db.projects.toArray();
    set({ projects });
    return newProject;
  },

  deleteProject: async (id) => {
    // Cascade delete
    const zones = await db.zones.where('proyectoId').equals(id).toArray();
    const zoneIds = zones.map((z) => z.id);

    const circuits = zoneIds.length > 0
      ? await db.circuits.where('zonaId').anyOf(zoneIds).toArray()
      : [];
    const circuitIds = circuits.map((c) => c.id);

    if (circuitIds.length > 0) {
      const outlets = await db.outlets.where('circuitoId').anyOf(circuitIds).toArray();
      await db.outlets.bulkDelete(outlets.map((o) => o.id));
    }

    if (circuitIds.length > 0) {
      await db.circuits.bulkDelete(circuitIds);
    }
    if (zoneIds.length > 0) {
      await db.zones.bulkDelete(zoneIds);
    }

    const bomEntries = await db.bomEntries.where('proyectoId').equals(id).toArray();
    const bomIds = bomEntries.map((b) => b.id);
    if (bomIds.length > 0) {
      const adjustments = await db.adjustments.where('bomId').anyOf(bomIds).toArray();
      await db.adjustments.bulkDelete(adjustments.map((a) => a.id));
      await db.bomEntries.bulkDelete(bomIds);
    }

    await db.snapshots.where('proyectoId').equals(id).delete();
    await db.projects.delete(id);

    const projects = await db.projects.toArray();
    set({ projects, activeProject: null });
  },

  saveProject: async () => {
    const { activeProject } = get();
    if (!activeProject) return;

    const now = new Date().toISOString();
    await db.projects.update(activeProject.id, { modificadoEn: now });
    set({ lastSaved: now });
  },

  // ── Zones ──

  addZone: async (nombre, descripcion = '') => {
    const { activeProject, zones } = get();
    if (!activeProject) throw new Error('No hay proyecto activo');

    const zone: Zone = {
      id: uuidv4(),
      proyectoId: activeProject.id,
      nombre,
      descripcion,
      orden: zones.length,
    };

    await db.zones.add(zone);
    set({ zones: [...zones, zone] });
    return zone;
  },

  updateZone: async (id, data) => {
    await db.zones.update(id, data);
    const zones = get().zones.map((z) => (z.id === id ? { ...z, ...data } : z));
    set({ zones });
  },

  deleteZone: async (id) => {
    // Cascade: delete circuits and outlets in this zone
    const circuits = await db.circuits.where('zonaId').equals(id).toArray();
    const circuitIds = circuits.map((c) => c.id);

    if (circuitIds.length > 0) {
      const outlets = await db.outlets.where('circuitoId').anyOf(circuitIds).toArray();
      await db.outlets.bulkDelete(outlets.map((o) => o.id));
      await db.circuits.bulkDelete(circuitIds);
    }

    await db.zones.delete(id);

    const state = get();
    set({
      zones: state.zones.filter((z) => z.id !== id),
      circuits: state.circuits.filter((c) => !circuitIds.includes(c.id)),
      outlets: state.outlets.filter((o) => !circuitIds.includes(o.circuitoId)),
    });

    // Trigger BOM recalculation
    await get().recalculateBOM();
  },

  // ── Circuits ──

  addCircuit: async (zonaId, nombre) => {
    const { activeProject, circuits } = get();
    if (!activeProject) throw new Error('No hay proyecto activo');

    const profile = getProfileById(activeProject.perfilNormativoId);
    const zoneCircuits = circuits.filter((c) => c.zonaId === zonaId);

    const circuit: Circuit = {
      id: uuidv4(),
      zonaId,
      nombre: nombre ?? `C-${String(zoneCircuits.length + 1).padStart(2, '0')}`,
      capacidadBreaker: (profile?.capacidadBreakerDefault ?? 20) as BreakerCapacity,
      maxTomacorrientes: profile?.maxTomacorrientesPorCircuito20A ?? 10,
      asignacionAuto: true,
    };

    await db.circuits.add(circuit);
    set({ circuits: [...circuits, circuit] });
    return circuit;
  },

  updateCircuit: async (id, data) => {
    await db.circuits.update(id, data);
    const circuits = get().circuits.map((c) =>
      c.id === id ? { ...c, ...data } : c
    );
    set({ circuits });
  },

  deleteCircuit: async (id) => {
    const outlets = await db.outlets.where('circuitoId').equals(id).toArray();
    await db.outlets.bulkDelete(outlets.map((o) => o.id));
    await db.circuits.delete(id);

    const state = get();
    set({
      circuits: state.circuits.filter((c) => c.id !== id),
      outlets: state.outlets.filter((o) => o.circuitoId !== id),
    });

    await get().recalculateBOM();
  },

  // ── Outlets ──

  addOutlet: async (circuitoId, tipo, montaje, cantidad, notas = '') => {
    const outlet: OutletGroup = {
      id: uuidv4(),
      circuitoId,
      tipo,
      montaje,
      cantidad,
      notas,
    };

    await db.outlets.add(outlet);
    set({ outlets: [...get().outlets, outlet] });

    await get().recalculateBOM();
    return outlet;
  },

  updateOutlet: async (id, data) => {
    await db.outlets.update(id, data);
    const outlets = get().outlets.map((o) =>
      o.id === id ? { ...o, ...data } : o
    );
    set({ outlets });

    await get().recalculateBOM();
  },

  deleteOutlet: async (id) => {
    await db.outlets.delete(id);
    set({ outlets: get().outlets.filter((o) => o.id !== id) });

    await get().recalculateBOM();
  },

  // ── BOM ──

  recalculateBOM: async () => {
    const { activeProject, circuits, outlets, bomEntries } = get();
    if (!activeProject) return;

    const profile = getProfileById(activeProject.perfilNormativoId);
    if (!profile) return;

    const [mats, ofs] = await Promise.all([
      db.materials.toArray(),
      db.ofertas.toArray(),
    ]);
    const catalog = [...mats, ...ofs].filter((m) => m.activo);

    const result = calculateBOM({
      projectId: activeProject.id,
      project: activeProject,
      circuits: circuits,
      outlets: outlets,
      profile,
      catalog,
      existingBOM: bomEntries,
    });

    // Persist to DB
    await db.bomEntries.where('proyectoId').equals(activeProject.id).delete();
    if (result.entries.length > 0) {
      await db.bomEntries.bulkAdd(result.entries);
    }

    const totals = calculateBOMTotal(result.entries, activeProject.tasaImpuesto);

    set({
      bomEntries: result.entries,
      bomSubtotal: totals.subtotal,
      bomTaxAmount: totals.taxAmount,
      bomTotal: totals.total,
    });

    if (result.warnings.length > 0) {
      console.warn('BOM warnings:', result.warnings);
    }
  },

  adjustBOMEntry: async (bomId, newQuantity, justification) => {
    const entry = get().bomEntries.find((e) => e.id === bomId);
    if (!entry) return;

    const now = new Date().toISOString();
    const adjustment: Adjustment = {
      id: uuidv4(),
      bomId,
      usuarioId: 'local-user',
      cantidadAnterior: entry.cantidadAjustada,
      cantidadNueva: newQuantity,
      justificacion: justification,
      timestamp: now,
      esRestauracion: false,
    };

    await db.adjustments.add(adjustment);
    await db.bomEntries.update(bomId, {
      cantidadAjustada: newQuantity,
      ultimaActualizacion: now,
    });

    const { activeProject } = get();
    const updatedEntries = get().bomEntries.map((e) =>
      e.id === bomId
        ? { ...e, cantidadAjustada: newQuantity, ultimaActualizacion: now }
        : e
    );

    const totals = calculateBOMTotal(
      updatedEntries,
      activeProject?.tasaImpuesto ?? 0
    );

    set({
      bomEntries: updatedEntries,
      adjustments: [...get().adjustments, adjustment],
      bomSubtotal: totals.subtotal,
      bomTaxAmount: totals.taxAmount,
      bomTotal: totals.total,
    });
  },

  restoreBOMEntry: async (bomId) => {
    const entry = get().bomEntries.find((e) => e.id === bomId);
    if (!entry) return;
    if (entry.cantidadAjustada === entry.cantidadEstimada) return;

    const now = new Date().toISOString();
    const adjustment: Adjustment = {
      id: uuidv4(),
      bomId,
      usuarioId: 'local-user',
      cantidadAnterior: entry.cantidadAjustada,
      cantidadNueva: entry.cantidadEstimada,
      justificacion: `Restaurado a estimación base por local-user el ${now}.`,
      timestamp: now,
      esRestauracion: true,
    };

    await db.adjustments.add(adjustment);
    await db.bomEntries.update(bomId, {
      cantidadAjustada: entry.cantidadEstimada,
      ultimaActualizacion: now,
    });

    const { activeProject } = get();
    const updatedEntries = get().bomEntries.map((e) =>
      e.id === bomId
        ? { ...e, cantidadAjustada: e.cantidadEstimada, ultimaActualizacion: now }
        : e
    );

    const totals = calculateBOMTotal(
      updatedEntries,
      activeProject?.tasaImpuesto ?? 0
    );

    set({
      bomEntries: updatedEntries,
      adjustments: [...get().adjustments, adjustment],
      bomSubtotal: totals.subtotal,
      bomTaxAmount: totals.taxAmount,
      bomTotal: totals.total,
    });
  },

  restoreAllBOM: async () => {
    const { bomEntries, activeProject } = get();
    if (!activeProject) return;

    const now = new Date().toISOString();
    const newAdjustments: Adjustment[] = [];

    for (const entry of bomEntries) {
      if (entry.cantidadAjustada === entry.cantidadEstimada) continue;

      const adjustment: Adjustment = {
        id: uuidv4(),
        bomId: entry.id,
        usuarioId: 'local-user',
        cantidadAnterior: entry.cantidadAjustada,
        cantidadNueva: entry.cantidadEstimada,
        justificacion: `Restauración masiva a estimación base por local-user el ${now}.`,
        timestamp: now,
        esRestauracion: true,
      };
      newAdjustments.push(adjustment);

      await db.bomEntries.update(entry.id, {
        cantidadAjustada: entry.cantidadEstimada,
        ultimaActualizacion: now,
      });
    }

    if (newAdjustments.length > 0) {
      await db.adjustments.bulkAdd(newAdjustments);
    }

    const updatedEntries = bomEntries.map((e) => ({
      ...e,
      cantidadAjustada: e.cantidadEstimada,
      ultimaActualizacion: now,
    }));

    const totals = calculateBOMTotal(updatedEntries, activeProject.tasaImpuesto);

    set({
      bomEntries: updatedEntries,
      adjustments: [...get().adjustments, ...newAdjustments],
      bomSubtotal: totals.subtotal,
      bomTaxAmount: totals.taxAmount,
      bomTotal: totals.total,
    });
  },

  clearActiveProject: () => {
    set({
      activeProject: null,
      zones: [],
      circuits: [],
      outlets: [],
      bomEntries: [],
      adjustments: [],
      bomSubtotal: 0,
      bomTaxAmount: 0,
      bomTotal: 0,
    });
  },
}));
