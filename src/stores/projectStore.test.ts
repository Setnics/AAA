import { describe, expect, it } from 'vitest';
import { db } from '../database/db';
import { useProjectStore } from './projectStore';
import type { BOMEntry, Project } from '../database/schema';

describe('useProjectStore', () => {
  it('crea proyectos con defaults operativos y los persiste', async () => {
    const project = await useProjectStore.getState().createProject({
      nombre: 'Proyecto estable',
      nivelElectrificacion: 'ESPECIAL',
      porcentajeManoObra: 25,
      tasaImpuesto: 13,
    });

    const persisted = await db.projects.get(project.id);

    expect(project).toMatchObject({
      nombre: 'Proyecto estable',
      nivelElectrificacion: 'ESPECIAL',
      porcentajeManoObra: 25,
      tasaImpuesto: 13,
      estado: 'BORRADOR',
      moneda: 'USD',
    });
    expect(persisted).toMatchObject({
      id: project.id,
      nombre: 'Proyecto estable',
      nivelElectrificacion: 'ESPECIAL',
      porcentajeManoObra: 25,
    });
    expect(useProjectStore.getState().projects).toHaveLength(1);
  });

  it('ajusta y restaura entradas del BOM actualizando estado y persistencia', async () => {
    const project = await useProjectStore.getState().createProject({
      nombre: 'Proyecto BOM',
      tasaImpuesto: 13,
    });
    const activeProject: Project = { ...project, tasaImpuesto: 13 };
    const bomEntry: BOMEntry = {
      id: 'bom-1',
      proyectoId: activeProject.id,
      materialId: 'mat-1',
      cantidadEstimada: 2,
      cantidadAjustada: 2,
      precioUnitarioSnap: 10,
      ultimaActualizacion: '2026-01-01T00:00:00.000Z',
    };

    await db.bomEntries.add(bomEntry);
    useProjectStore.setState({
      activeProject,
      bomEntries: [bomEntry],
      adjustments: [],
      bomSubtotal: 20,
      bomTaxAmount: 2.6,
      bomTotal: 22.6,
    });

    await useProjectStore.getState().adjustBOMEntry(bomEntry.id, 5, 'Ajuste manual valido');

    let state = useProjectStore.getState();
    let persistedEntries = await db.bomEntries.toArray();
    let persistedAdjustments = await db.adjustments.toArray();

    expect(state.bomEntries[0].cantidadAjustada).toBe(5);
    expect(state.adjustments).toHaveLength(1);
    expect(state.bomSubtotal).toBe(50);
    expect(state.bomTaxAmount).toBe(6.5);
    expect(state.bomTotal).toBe(56.5);
    expect(persistedEntries[0].cantidadAjustada).toBe(5);
    expect(persistedAdjustments).toHaveLength(1);

    await useProjectStore.getState().restoreAllBOM();

    state = useProjectStore.getState();
    persistedEntries = await db.bomEntries.toArray();
    persistedAdjustments = await db.adjustments.toArray();

    expect(state.bomEntries[0].cantidadAjustada).toBe(2);
    expect(state.adjustments).toHaveLength(2);
    expect(state.bomSubtotal).toBe(20);
    expect(state.bomTaxAmount).toBe(2.6);
    expect(state.bomTotal).toBe(22.6);
    expect(persistedEntries[0].cantidadAjustada).toBe(2);
    expect(persistedAdjustments).toHaveLength(2);
    expect(persistedAdjustments.some((adjustment) => adjustment.esRestauracion)).toBe(true);
  });
});
