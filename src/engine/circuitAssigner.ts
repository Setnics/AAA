/**
 * SEITE — Circuit Auto-Assignment Engine
 *
 * Distributes outlets to circuits following SRS §4.1.1 rules:
 * 1. 240V TCs → dedicated circuit (one per TC)
 * 2. GFCI/AFCI assigned first (priority)
 * 3. Standard 120V fill by order until maxTC
 *
 * FIX #2: Se eliminó getLastAssignedCircuitId() que era poco confiable.
 * Ahora cada outlet registra directamente el circuito que lo recibió.
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
    circuitFill.set(circuit.id, 0);
    return circuit;
  }

  // Track current fill level per circuit
  const circuitFill = new Map<string, number>();

  // Helper: find or create a circuit with available capacity
  function getAvailableCircuit(): Circuit {
    for (const circuit of circuits) {
      const fill = circuitFill.get(circuit.id) ?? 0;
      if (fill < circuit.maxTomacorrientes) {
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
    let lastCircuitId = '';
    for (let i = 0; i < outlet.cantidad; i++) {
      const circuit = createCircuit(30);
      circuit.maxTomacorrientes = 1;
      circuitFill.set(circuit.id, 1);
      lastCircuitId = circuit.id;
    }
    // FIX: Asignamos directamente el ID del último circuito creado para este grupo
    assignments.set(outlet.id, lastCircuitId);
  }

  // ── Step 3: GFCI/AFCI priority assignment ──

  for (const outlet of gfciAfciOutlets) {
    let remaining = outlet.cantidad;
    let lastCircuitId = '';
    while (remaining > 0) {
      const circuit = getAvailableCircuit();
      const currentFill = circuitFill.get(circuit.id) ?? 0;
      const available = circuit.maxTomacorrientes - currentFill;
      const toAssign = Math.min(remaining, available);
      circuitFill.set(circuit.id, currentFill + toAssign);
      remaining -= toAssign;
      // FIX: Rastreamos el último circuito que recibió TCs de este grupo
      lastCircuitId = circuit.id;
    }
    assignments.set(outlet.id, lastCircuitId);
  }

  // ── Step 4: Standard 120V fill ──

  for (const outlet of standardOutlets) {
    let remaining = outlet.cantidad;
    let lastCircuitId = '';
    while (remaining > 0) {
      const circuit = getAvailableCircuit();
      const currentFill = circuitFill.get(circuit.id) ?? 0;
      const available = circuit.maxTomacorrientes - currentFill;
      const toAssign = Math.min(remaining, available);
      circuitFill.set(circuit.id, currentFill + toAssign);
      remaining -= toAssign;
      // FIX: Rastreamos el último circuito que recibió TCs de este grupo
      lastCircuitId = circuit.id;
    }
    assignments.set(outlet.id, lastCircuitId);
  }

  return { circuits, assignments };
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
