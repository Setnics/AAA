import { describe, expect, it } from 'vitest';
import { autoAssignOutletsToCircuits, validateCircuitCapacity } from './circuitAssigner';
import type { Circuit, OutletGroup } from '../database/schema';

describe('autoAssignOutletsToCircuits', () => {
  it('crea un circuito dedicado de 30A por cada tomacorriente 240V', () => {
    const outlet240: OutletGroup = {
      id: 'outlet-240',
      circuitoId: 'unassigned',
      tipo: 'ESTANDAR_240',
      montaje: 'EMPOTRADO',
      cantidad: 2,
      notas: '',
    };

    const result = autoAssignOutletsToCircuits({
      zoneId: 'zone-1',
      outlets: [outlet240],
      existingCircuits: [],
      maxTCPerCircuit: 10,
      defaultBreakerCapacity: 20,
    });

    expect(result.circuits).toHaveLength(2);
    expect(result.circuits.every((circuit) => circuit.capacidadBreaker === 30)).toBe(true);
    expect(result.circuits.every((circuit) => circuit.maxTomacorrientes === 1)).toBe(true);
    expect(result.assignments.get(outlet240.id)).toBe(result.circuits[1].id);
  });

  it('crea circuitos adicionales cuando un grupo excede la capacidad maxima', () => {
    const standardOutlet: OutletGroup = {
      id: 'outlet-standard',
      circuitoId: 'unassigned',
      tipo: 'ESTANDAR_120',
      montaje: 'EMPOTRADO',
      cantidad: 4,
      notas: '',
    };

    const result = autoAssignOutletsToCircuits({
      zoneId: 'zone-1',
      outlets: [standardOutlet],
      existingCircuits: [],
      maxTCPerCircuit: 3,
      defaultBreakerCapacity: 20,
    });

    expect(result.circuits).toHaveLength(2);
    expect(result.circuits.map((circuit) => circuit.nombre)).toEqual(['C-01', 'C-02']);
    expect(result.assignments.get(standardOutlet.id)).toBe(result.circuits[1].id);
  });
});

describe('validateCircuitCapacity', () => {
  it('detecta cuando un circuito esta sobre capacidad', () => {
    const circuit: Circuit = {
      id: 'circuit-1',
      zonaId: 'zone-1',
      nombre: 'C-01',
      capacidadBreaker: 20,
      maxTomacorrientes: 3,
      asignacionAuto: true,
    };
    const outlets: OutletGroup[] = [
      {
        id: 'outlet-1',
        circuitoId: circuit.id,
        tipo: 'ESTANDAR_120',
        montaje: 'EMPOTRADO',
        cantidad: 2,
        notas: '',
      },
      {
        id: 'outlet-2',
        circuitoId: circuit.id,
        tipo: 'GFCI',
        montaje: 'SUPERFICIAL',
        cantidad: 2,
        notas: '',
      },
    ];

    expect(validateCircuitCapacity(circuit, outlets)).toEqual({
      isOverCapacity: true,
      currentCount: 4,
      maxCount: 3,
    });
  });
});
