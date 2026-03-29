/**
 * SEITE — Circuit Auto-Assignment Engine
 *
 * Distributes outlets to circuits following SRS §4.1.1 rules:
 * 1. 240V TCs → dedicated circuit (one per TC)
 * 2. GFCI/AFCI assigned first (priority)
 * 3. Standard 120V fill by order until maxTC
 */

import type {
  OutletGroup,
  Circuit,
  OutletType,
  BreakerCapacity,
} from '../database/schema';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ──────────────────────────────────────────────

interface AssignmentInput {
  zoneId: string;
  outlets: OutletGroup[];
  existingCircuits: Circuit[];
  maxTCPerCircuit: number;
  defaultBreakerCapacity: BreakerCapacity;
}

interface AssignmentResult {
  circuits: Circuit[];
  assignments: Map<string, string>; // outletId → circuitId
}

// ─── Priority Classification ────────────────────────────

function isDedicated240V(type: OutletType): boolean {
  return type === 'ESTANDAR_240';
}

function isGFCIorAFCI(type: OutletType): boolean {
  return (
    type === 'GFCI' ||
    type === 'AFCI' ||
    type === 'GFCI_AFCI' ||
    type === 'GFCI_TR_120' ||
    type === 'GFCI_WR_120'
  );
}

// ─── Main Assignment Logic ──────────────────────────────

export function autoAssignOutletsToCircuits(
  input: AssignmentInput
): AssignmentResult {
  const { zoneId, outlets, maxTCPerCircuit, defaultBreakerCapacity } = input;

  const circuits: Circuit[] = [];
  const assignments = new Map<string, string>();
  let circuitCounter = 0;

  // Helper: create a new circuit
  function createCircuit(capacityOverride?: BreakerCapacity): Circuit {
    circuitCounter++;
    const circuit: Circuit = {
      id: uuidv4(),
      zonaId: zoneId,
      nombre: `C-${String(circuitCounter).padStart(2, '0')}`,
      capacidadBreaker: capacityOverride ?? defaultBreakerCapacity,
      maxTomacorrientes: maxTCPerCircuit,
      asignacionAuto: true,
    };
    circuits.push(circuit);
    return circuit;
  }

  // Track current fill level per circuit
  const circuitFill = new Map<string, number>();

  // Helper: find or create a circuit with available capacity
  function getAvailableCircuit(): Circuit {
    for (const circuit of circuits) {
      const fill = circuitFill.get(circuit.id) ?? 0;
      if (fill < maxTCPerCircuit) {
        return circuit;
      }
    }
    return createCircuit();
  }

  // ── Step 1: Separate outlets by priority ──

  const dedicated240V: OutletGroup[] = [];
  const gfciAfciOutlets: OutletGroup[] = [];
  const standardOutlets: OutletGroup[] = [];

  for (const outlet of outlets) {
    if (isDedicated240V(outlet.tipo)) {
      dedicated240V.push(outlet);
    } else if (isGFCIorAFCI(outlet.tipo)) {
      gfciAfciOutlets.push(outlet);
    } else {
      standardOutlets.push(outlet);
    }
  }

  // ── Step 2: 240V → one dedicated circuit per TC ──

  for (const outlet of dedicated240V) {
    for (let i = 0; i < outlet.cantidad; i++) {
      const circuit = createCircuit(
        outlet.tipo === 'ESTANDAR_240' ? 30 : defaultBreakerCapacity
      );
      circuit.maxTomacorrientes = 1;
      circuitFill.set(circuit.id, 1);
      assignments.set(`${outlet.id}_${i}`, circuit.id);
    }
    // Assign the outlet group to the last created circuit
    assignments.set(outlet.id, circuits[circuits.length - 1]?.id ?? '');
  }

  // ── Step 3: GFCI/AFCI priority assignment ──

  for (const outlet of gfciAfciOutlets) {
    let remaining = outlet.cantidad;
    while (remaining > 0) {
      const circuit = getAvailableCircuit();
      const currentFill = circuitFill.get(circuit.id) ?? 0;
      const available = maxTCPerCircuit - currentFill;
      const toAssign = Math.min(remaining, available);

      circuitFill.set(circuit.id, currentFill + toAssign);
      remaining -= toAssign;
    }
    assignments.set(outlet.id, getLastAssignedCircuitId(circuits, circuitFill));
  }

  // ── Step 4: Standard 120V fill ──

  for (const outlet of standardOutlets) {
    let remaining = outlet.cantidad;
    while (remaining > 0) {
      const circuit = getAvailableCircuit();
      const currentFill = circuitFill.get(circuit.id) ?? 0;
      const available = maxTCPerCircuit - currentFill;
      const toAssign = Math.min(remaining, available);

      circuitFill.set(circuit.id, currentFill + toAssign);
      remaining -= toAssign;
    }
    assignments.set(outlet.id, getLastAssignedCircuitId(circuits, circuitFill));
  }

  return { circuits, assignments };
}

function getLastAssignedCircuitId(
  circuits: Circuit[],
  circuitFill: Map<string, number>
): string {
  // Return the last circuit that has any fill
  for (let i = circuits.length - 1; i >= 0; i--) {
    const fill = circuitFill.get(circuits[i].id) ?? 0;
    if (fill > 0) return circuits[i].id;
  }
  return circuits[circuits.length - 1]?.id ?? '';
}

// ─── Validation ─────────────────────────────────────────

export function validateCircuitCapacity(
  circuit: Circuit,
  outlets: OutletGroup[]
): { isOverCapacity: boolean; currentCount: number; maxCount: number } {
  const currentCount = outlets.reduce((sum, o) => sum + o.cantidad, 0);
  return {
    isOverCapacity: currentCount > circuit.maxTomacorrientes,
    currentCount,
    maxCount: circuit.maxTomacorrientes,
  };
}
