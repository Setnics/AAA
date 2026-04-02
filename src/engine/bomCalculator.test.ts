import { describe, expect, it } from 'vitest';
import { calculateBOM, calculateBOMSubtotal, calculateBOMTotal } from './bomCalculator';
import type {
  BOMEntry,
  Circuit,
  Material,
  NormativeProfile,
  OutletGroup,
  Project,
} from '../database/schema';

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    nombre: 'Proyecto de prueba',
    descripcion: '',
    cliente: '',
    ubicacion: '',
    area: 120,
    nivelElectrificacion: 'BAJO',
    perfilNormativoId: 'TEST',
    moneda: 'CRC',
    tipoCambio: 500,
    tasaImpuesto: 13,
    porcentajeDesperdicioCable: 15,
    porcentajeDesperdicioTubo: 10,
    margenContingencia: 5,
    porcentajeManoObra: 35,
    estado: 'BORRADOR',
    versionActual: 1,
    creadoPor: 'tester',
    creadoEn: '2026-01-01T00:00:00.000Z',
    modificadoEn: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createProfile(): NormativeProfile {
  return {
    id: 'TEST',
    nombre: 'Perfil de prueba',
    normativa: 'Interna',
    maxTomacorrientesPorCircuito20A: 10,
    capacidadBreakerDefault: 20,
    factorDesperdicioCondutor: 0.15,
    coefConduitPorTC120: 1,
    maxConductoresPorConduit34: 3,
    requiereCircuitoPropioTC240: true,
    coeficientes: [
      { materialCodigo: 'CAB-TEST', outletType: 'ESTANDAR_120', mountType: 'ALL', coefficient: 3.5 },
      { materialCodigo: 'TUBE-TEST', outletType: 'ESTANDAR_120', mountType: 'ALL', coefficient: 2 },
    ],
  };
}

describe('calculateBOM', () => {
  it('preserva ajustes manuales, convierte moneda y advierte por enlaces faltantes', () => {
    const project = createProject();
    const profile = createProfile();
    const circuits: Circuit[] = [
      {
        id: 'circuit-1',
        zonaId: 'zone-1',
        nombre: 'C-01',
        capacidadBreaker: 20,
        maxTomacorrientes: 10,
        asignacionAuto: true,
      },
    ];
    const outlets: OutletGroup[] = [
      {
        id: 'outlet-1',
        circuitoId: 'circuit-1',
        tipo: 'ESTANDAR_120',
        montaje: 'EMPOTRADO',
        cantidad: 2,
        notas: '',
      },
    ];
    const catalog: Material[] = [
      {
        id: 'mat-cable',
        codigo: 'CAB-TEST',
        descripcion: 'Cable de prueba',
        unidad: 'ML',
        precioUnitario: 2,
        monedaCatalogo: 'USD',
        activo: true,
        categoria: 'CONDUCTOR',
        creadoEn: '2026-01-01T00:00:00.000Z',
        enlaceReferencia: '',
      },
      {
        id: 'mat-tube',
        codigo: 'TUBE-TEST',
        descripcion: 'Tuberia de prueba',
        unidad: 'M',
        precioUnitario: 1000,
        monedaCatalogo: 'CRC',
        activo: true,
        categoria: 'TUBERIA',
        creadoEn: '2026-01-01T00:00:00.000Z',
        enlaceReferencia: 'https://example.com/tube',
      },
      {
        id: 'mat-breaker',
        codigo: 'BREAKER-20A',
        descripcion: 'Breaker 20A',
        unidad: 'UN',
        precioUnitario: 500,
        monedaCatalogo: 'CRC',
        activo: true,
        categoria: 'PROTECCION',
        creadoEn: '2026-01-01T00:00:00.000Z',
        enlaceReferencia: 'https://example.com/breaker',
      },
    ];
    const existingBOM: BOMEntry[] = [
      {
        id: 'bom-cable',
        proyectoId: project.id,
        materialId: 'mat-cable',
        cantidadEstimada: 8.1,
        cantidadAjustada: 9.5,
        precioUnitarioSnap: 1000,
        ultimaActualizacion: '2026-01-01T00:00:00.000Z',
      },
    ];

    const result = calculateBOM({
      projectId: project.id,
      project,
      circuits,
      outlets,
      profile,
      catalog,
      existingBOM,
    });

    const cableEntry = result.entries.find((entry) => entry.materialId === 'mat-cable');
    const tubeEntry = result.entries.find((entry) => entry.materialId === 'mat-tube');
    const breakerEntry = result.entries.find((entry) => entry.materialId === 'mat-breaker');

    expect(result.entries).toHaveLength(3);
    expect(cableEntry).toMatchObject({
      id: 'bom-cable',
      cantidadEstimada: 8.1,
      cantidadAjustada: 9.5,
      precioUnitarioSnap: 1000,
    });
    expect(tubeEntry).toMatchObject({
      cantidadEstimada: 5,
      cantidadAjustada: 5,
      precioUnitarioSnap: 1000,
    });
    expect(breakerEntry).toMatchObject({
      cantidadEstimada: 1,
      cantidadAjustada: 1,
      precioUnitarioSnap: 500,
    });
    expect(result.warnings.some((warning) => warning.includes('CAB-TEST'))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes('enlace de referencia verificado'))).toBe(true);
    expect(result.laborEntry?.descripcion).toContain('(35%)');
    expect(result.laborEntry?.monto).toBe(5250);
    expect(result.contingencyEntry?.descripcion).toContain('(5%)');
    expect(result.contingencyEntry?.monto).toBe(1012.5);
  });

  it('reporta materiales faltantes y calcula subtotales e impuestos', () => {
    const project = createProject({ porcentajeManoObra: 40 });
    const profile = createProfile();
    profile.coeficientes.push({
      materialCodigo: 'MISSING-MAT',
      outletType: 'ESTANDAR_120',
      mountType: 'ALL',
      coefficient: 1,
    });

    const result = calculateBOM({
      projectId: project.id,
      project,
      circuits: [],
      outlets: [
        {
          id: 'outlet-1',
          circuitoId: 'circuit-1',
          tipo: 'ESTANDAR_120',
          montaje: 'EMPOTRADO',
          cantidad: 1,
          notas: '',
        },
      ],
      profile,
      catalog: [],
      existingBOM: [],
    });

    expect(result.warnings.some((warning) => warning.includes('CAB-TEST') && warning.includes('no encontrado'))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes('TUBE-TEST') && warning.includes('no encontrado'))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes('MISSING-MAT') && warning.includes('no encontrado'))).toBe(true);
    expect(result.entries.find((entry) => entry.materialId === 'MISSING-MAT')).toMatchObject({
      cantidadEstimada: 1,
      precioUnitarioSnap: 0,
    });

    const subtotal = calculateBOMSubtotal([
      {
        id: 'bom-1',
        proyectoId: project.id,
        materialId: 'mat-1',
        cantidadEstimada: 2,
        cantidadAjustada: 3,
        precioUnitarioSnap: 1500,
        ultimaActualizacion: '2026-01-01T00:00:00.000Z',
      },
    ]);
    const totals = calculateBOMTotal(
      [
        {
          id: 'bom-1',
          proyectoId: project.id,
          materialId: 'mat-1',
          cantidadEstimada: 2,
          cantidadAjustada: 3,
          precioUnitarioSnap: 1500,
          ultimaActualizacion: '2026-01-01T00:00:00.000Z',
        },
      ],
      13
    );

    expect(subtotal).toBe(4500);
    expect(totals).toEqual({
      subtotal: 4500,
      taxAmount: 585,
      total: 5085,
    });
  });
});
