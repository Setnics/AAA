/**
 * SEITE — Project Editor Page
 *
 * Main workspace with tabbed interface:
 * - Zonas & Circuitos (M-02)
 * - Tomacorrientes (M-03)
 * - BOM (M-04, M-05)
 * - Exportar (M-07)
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { getProfileById } from '../database/normativeProfiles';
import { db } from '../database/db';
import type {
  Zone,
  Circuit,
  OutletType,
  MountType,
  Material,
  OfertaMaterial,
  BOMEntry,
  BreakerCapacity,
  OutletGroup,
} from '../database/schema';

// ─── Constants ──────────────────────────────────────────

const OUTLET_TYPE_LABELS: Record<OutletType, string> = {
  ESTANDAR_120: 'Estándar 120V',
  DOBLE_120: 'Doble 120V',
  TRIPLE_120: 'Triple 120V',
  ESTANDAR_240: 'Estándar 240V',
  GFCI: 'GFCI',
  AFCI: 'AFCI',
  GFCI_AFCI: 'GFCI + AFCI',
  TR_120: 'Tamper Resistant (TR) 120V',
  WR_120: 'Weather Resistant (WR) 120V',
  GFCI_TR_120: 'GFCI + TR 120V',
  GFCI_WR_120: 'GFCI + WR 120V',
};

const MOUNT_TYPE_LABELS: Record<MountType, string> = {
  EMPOTRADO: 'Empotrado',
  SUPERFICIAL: 'Superficial',
};

type TabId = 'configuracion' | 'zonas' | 'tomacorrientes' | 'bom' | 'exportar';

// ─── Settings Tab ────────────────────────────────────────

function ConfiguracionTab() {
  const { activeProject, updateProject, recalculateBOM } = useProjectStore();

  if (!activeProject) return null;

  const handleChange = async (field: keyof typeof activeProject, value: any) => {
    await updateProject(activeProject.id, { [field]: value });
    
    // Si cambia el tipo de cambio, debemos recalcular el BOM para actualizar precios snap
    if (field === 'tipoCambio') {
      await recalculateBOM();
    }
  };

  return (
    <div style={{ maxWidth: '600px' }}>
      <div className="card mb-6">
        <h3 className="card__title" style={{ marginBottom: 'var(--space-4)' }}>
          Configuración Avanzada (NEC 2020)
        </h3>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Tipo de Cambio</label>
            <input
              className="form-input"
              type="number"
              min={1}
              value={activeProject.tipoCambio}
              onChange={(e) => handleChange('tipoCambio', parseFloat(e.target.value) || 1)}
              title="Equivalencia 1 USD = X CRC"
              style={{ maxWidth: '200px' }}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Área del Proyecto (m²)</label>
            <input
              className="form-input"
              type="number"
              min={0}
              value={activeProject.area}
              onChange={(e) => handleChange('area', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Nivel de Electrificación</label>
            <select
              className="form-select"
              value={activeProject.nivelElectrificacion}
              onChange={(e) => handleChange('nivelElectrificacion', e.target.value)}
            >
              <option value="BAJO">Bajo</option>
              <option value="MEDIO">Medio</option>
              <option value="ALTO">Alto</option>
              <option value="ESPECIAL">Especial</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Desperdicio Conductores (%)</label>
            <input
              className="form-input"
              type="number"
              min={0}
              max={100}
              value={activeProject.porcentajeDesperdicioCable}
              onChange={(e) => handleChange('porcentajeDesperdicioCable', parseFloat(e.target.value) || 0)}
              title="Aplica para cableado, ej. 15%"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Desperdicio Canalización (%)</label>
            <input
              className="form-input"
              type="number"
              min={0}
              max={100}
              value={activeProject.porcentajeDesperdicioTubo}
              onChange={(e) => handleChange('porcentajeDesperdicioTubo', parseFloat(e.target.value) || 0)}
              title="Aplica para tubería EMT/PVC, ej. 10%"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Margen de Contingencia (%)</label>
          <input
            className="form-input"
            type="number"
            min={0}
            max={100}
            value={activeProject.margenContingencia}
            onChange={(e) => handleChange('margenContingencia', parseFloat(e.target.value) || 0)}
            style={{ maxWidth: '200px' }}
            title="Margen de seguridad para imprevistos, ej. 5%"
          />
        </div>

      </div>
    </div>
  );
}


// ─── Auto-Save Hook ─────────────────────────────────────

function useAutoSave() {
  const saveProject = useProjectStore((s) => s.saveProject);
  const activeProject = useProjectStore((s) => s.activeProject);
  const lastSaved = useProjectStore((s) => s.lastSaved);

  useEffect(() => {
    if (!activeProject) return;

    const interval = setInterval(() => {
      saveProject();
    }, 120_000); // 120 seconds per SRS RF-02

    return () => clearInterval(interval);
  }, [activeProject, saveProject]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveProject();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveProject]);

  // Ctrl+S manual save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveProject();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveProject]);

  return lastSaved;
}

// ─── Zones & Circuits Tab ───────────────────────────────

function ZonasTab() {
  const {
    zones,
    circuits,
    outlets,
    activeProject,
    addZone,
    updateZone,
    deleteZone,
    addCircuit,
    updateCircuit,
    deleteCircuit,
  } = useProjectStore();

  const [newZoneName, setNewZoneName] = useState('');
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editingCircuitId, setEditingCircuitId] = useState<string | null>(null);
  const [editCircuitName, setEditCircuitName] = useState('');
  const [editCircuitCapacity, setEditCircuitCapacity] = useState<BreakerCapacity>(20);
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());

  const toggleZoneExpand = (id: string) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddZone = async () => {
    if (!newZoneName.trim()) return;

    // Validate unique name (case-insensitive)
    const isDuplicate = zones.some(
      (z) => z.nombre.toLowerCase() === newZoneName.trim().toLowerCase()
    );
    if (isDuplicate) {
      alert('Ya existe una zona con este nombre en el proyecto.');
      return;
    }

    const zone = await addZone(newZoneName.trim());
    setNewZoneName('');
    setExpandedZones((prev) => new Set(prev).add(zone.id));
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await updateZone(id, { nombre: editName.trim() });
    setEditingZone(null);
  };

  const handleDeleteZone = async (zone: Zone) => {
    const circuitCount = circuits.filter((c) => c.zonaId === zone.id).length;
    const msg = circuitCount > 0
      ? `¿Eliminar la zona «${zone.nombre}» y sus ${circuitCount} circuito(s)? Esta acción es irreversible.`
      : `¿Eliminar la zona «${zone.nombre}»?`;
    if (!confirm(msg)) return;
    await deleteZone(zone.id);
  };

  const handleAddCircuit = async (zonaId: string) => {
    await addCircuit(zonaId);
  };

  const handleEditCircuit = (circuit: Circuit) => {
    setEditingCircuitId(circuit.id);
    setEditCircuitName(circuit.nombre);
    setEditCircuitCapacity(circuit.capacidadBreaker);
  };

  const handleSaveCircuit = async (id: string) => {
    if (!editCircuitName.trim()) return;
    await updateCircuit(id, {
      nombre: editCircuitName.trim(),
      capacidadBreaker: editCircuitCapacity,
    });
    setEditingCircuitId(null);
  };

  const handleDeleteCircuit = async (circuit: Circuit) => {
    const outletCount = outlets.filter((o) => o.circuitoId === circuit.id).length;
    const msg = outletCount > 0
      ? `¿Eliminar el circuito «${circuit.nombre}» y sus ${outletCount} tomacorriente(s)?`
      : `¿Eliminar el circuito «${circuit.nombre}»?`;
    if (!confirm(msg)) return;
    await deleteCircuit(circuit.id);
  };

  const profile = activeProject ? getProfileById(activeProject.perfilNormativoId) : null;

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Add Zone */}
      <div className="flex gap-3 mb-6">
        <input
          className="form-input"
          type="text"
          placeholder="Nombre de nueva zona (ej: Cocina, Oficina 1)..."
          value={newZoneName}
          onChange={(e) => setNewZoneName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddZone()}
          style={{ flex: 1 }}
        />
        <button className="btn btn--primary" onClick={handleAddZone} disabled={!newZoneName.trim()}>
          ＋ Agregar Zona
        </button>
      </div>

      {/* Zone List */}
      {zones.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🏗️</div>
          <h3 className="empty-state__title">Sin zonas</h3>
          <p className="empty-state__text">
            Agrega zonas para organizar los tomacorrientes (ej: Sala, Cocina, Oficina).
          </p>
        </div>
      ) : (
        <div className="flex-col gap-4">
          {zones.map((zone) => {
            const zoneCircuits = circuits.filter((c) => c.zonaId === zone.id);
            const isExpanded = expandedZones.has(zone.id);
            const totalTCs = zoneCircuits.reduce((sum, circ) => {
              return sum + outlets
                .filter((o) => o.circuitoId === circ.id)
                .reduce((s, o) => s + o.cantidad, 0);
            }, 0);

            return (
              <div key={zone.id} className="card">
                <div className="card__header" style={{ cursor: 'pointer' }} onClick={() => toggleZoneExpand(zone.id)}>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    {editingZone === zone.id ? (
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          className="form-input"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(zone.id)}
                          style={{ width: '200px' }}
                          autoFocus
                        />
                        <button className="btn btn--sm btn--primary" onClick={() => handleSaveEdit(zone.id)}>✓</button>
                        <button className="btn btn--sm btn--ghost" onClick={() => setEditingZone(null)}>✕</button>
                      </div>
                    ) : (
                      <div>
                        <h3 className="card__title">{zone.nombre}</h3>
                        <span className="text-sm text-muted">
                          {zoneCircuits.length} circuito(s) · {totalTCs} TC(s)
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => { setEditingZone(zone.id); setEditName(zone.nombre); }}
                      title="Editar"
                    >✏️</button>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => handleDeleteZone(zone)}
                      title="Eliminar"
                    >🗑️</button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: 'var(--space-4)' }}>
                    {/* Circuits inside zone */}
                    {zoneCircuits.length === 0 ? (
                      <p className="text-sm text-muted" style={{ padding: 'var(--space-3)' }}>
                        No hay circuitos. Agrega uno para comenzar a registrar tomacorrientes.
                      </p>
                    ) : (
                      <div className="flex-col gap-2">
                        {zoneCircuits.map((circuit) => {
                          const circuitOutlets = outlets.filter((o) => o.circuitoId === circuit.id);
                          const tcCount = circuitOutlets.reduce((s, o) => s + o.cantidad, 0);
                          const isOverCapacity = tcCount > circuit.maxTomacorrientes;

                          return (
                            <div
                              key={circuit.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: 'var(--space-2) var(--space-4)',
                                background: isOverCapacity ? '#fff3cd' : 'var(--color-surface-50)',
                                borderRadius: 'var(--radius-md)',
                                border: isOverCapacity ? '1px solid var(--color-warning)' : '1px solid var(--color-border)',
                              }}
                            >
                              {editingCircuitId === circuit.id ? (
                                <div className="flex gap-2 items-center" style={{ flex: 1 }}>
                                  <input
                                    className="form-input"
                                    value={editCircuitName}
                                    onChange={(e) => setEditCircuitName(e.target.value)}
                                    style={{ width: '120px', height: '32px' }}
                                    autoFocus
                                  />
                                  <select
                                    className="form-select"
                                    value={editCircuitCapacity}
                                    onChange={(e) => setEditCircuitCapacity(parseInt(e.target.value) as BreakerCapacity)}
                                    style={{ width: '80px', height: '32px', padding: '0 8px' }}
                                  >
                                    <option value={15}>15A</option>
                                    <option value={20}>20A</option>
                                    <option value={30}>30A</option>
                                    <option value={40}>40A</option>
                                    <option value={50}>50A</option>
                                  </select>
                                  <button className="btn btn--sm btn--primary" onClick={() => handleSaveCircuit(circuit.id)}>✓</button>
                                  <button className="btn btn--sm btn--ghost" onClick={() => setEditingCircuitId(null)}>✕</button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-3">
                                    <span className="font-semibold text-sm">{circuit.nombre}</span>
                                    <span className="badge badge--info">{circuit.capacidadBreaker}A</span>
                                    <span className="text-sm text-muted">
                                      {tcCount}/{circuit.maxTomacorrientes} TCs
                                    </span>
                                    {isOverCapacity && (
                                      <span className="badge badge--danger">⚠️ Sobre capacidad</span>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      className="btn btn--ghost btn--sm"
                                      onClick={() => handleEditCircuit(circuit)}
                                      title="Editar Circuito"
                                    >✏️</button>
                                    <button
                                      className="btn btn--ghost btn--sm"
                                      onClick={() => handleDeleteCircuit(circuit)}
                                      title="Eliminar Circuito"
                                    >🗑️</button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <button
                      className="btn btn--secondary btn--sm mt-4"
                      onClick={() => handleAddCircuit(zone.id)}
                      style={{ width: '100%' }}
                    >
                      ＋ Agregar Circuito {profile && `(${profile.capacidadBreakerDefault}A)`}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Outlets Tab ────────────────────────────────────────

function TomacorrientesTab() {
  const { zones, circuits, outlets, addOutlet, updateOutlet, deleteOutlet } = useProjectStore();

  const [selectedCircuit, setSelectedCircuit] = useState('');
  const [tipo, setTipo] = useState<OutletType>('ESTANDAR_120');
  const [montaje, setMontaje] = useState<MountType>('EMPOTRADO');
  const [cantidad, setCantidad] = useState(1);
  const [notas, setNotas] = useState('');
  const [editingOutletId, setEditingOutletId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Auto-select first circuit if none selected
  useEffect(() => {
    if (!selectedCircuit && circuits.length > 0) {
      setSelectedCircuit(circuits[0].id);
    }
  }, [circuits, selectedCircuit]);

  const handleAdd = async () => {
    setError('');

    if (!selectedCircuit) {
      setError('Selecciona un circuito primero.');
      return;
    }

    if (cantidad < 1 || cantidad > 50 || !Number.isInteger(cantidad)) {
      setError('La cantidad debe ser un número entero entre 1 y 50.');
      return;
    }

    if (editingOutletId) {
      await updateOutlet(editingOutletId, {
        circuitoId: selectedCircuit,
        tipo,
        montaje,
        cantidad,
        notas: notas.trim(),
      });
      setEditingOutletId(null);
    } else {
      await addOutlet(selectedCircuit, tipo, montaje, cantidad, notas.trim());
    }
    
    setCantidad(1);
    setNotas('');
  };

  const handleEdit = (outlet: OutletGroup) => {
    setEditingOutletId(outlet.id);
    setSelectedCircuit(outlet.circuitoId);
    setTipo(outlet.tipo);
    setMontaje(outlet.montaje);
    setCantidad(outlet.cantidad);
    setNotas(outlet.notas);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingOutletId(null);
    setCantidad(1);
    setNotas('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este grupo de tomacorrientes?')) return;
    await deleteOutlet(id);
  };

  const getCircuitLabel = (circuitId: string): string => {
    const circuit = circuits.find((c) => c.id === circuitId);
    if (!circuit) return '';
    const zone = zones.find((z) => z.id === circuit.zonaId);
    return `${zone?.nombre ?? '?'} → ${circuit.nombre}`;
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Entry Form */}
      <div className="card mb-6">
        <h3 className="card__title" style={{ marginBottom: 'var(--space-4)' }}>
          {editingOutletId ? 'Editar Tomacorrientes' : 'Registrar Tomacorrientes'}
        </h3>

        {circuits.length === 0 ? (
          <p className="text-sm text-muted">
            Primero debes crear al menos una zona con un circuito en la pestaña "Zonas".
          </p>
        ) : (
          <div className="modal__body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="tc-circuit">Circuito *</label>
                <select
                  id="tc-circuit"
                  className="form-select"
                  value={selectedCircuit}
                  onChange={(e) => setSelectedCircuit(e.target.value)}
                >
                  {zones.map((zone) => {
                    const zc = circuits.filter((c) => c.zonaId === zone.id);
                    return zc.map((circuit) => (
                      <option key={circuit.id} value={circuit.id}>
                        {zone.nombre} → {circuit.nombre} ({circuit.capacidadBreaker}A)
                      </option>
                    ));
                  })}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="tc-type">Tipo *</label>
                <select
                  id="tc-type"
                  className="form-select"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as OutletType)}
                >
                  {Object.entries(OUTLET_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="tc-mount">Montaje *</label>
                <select
                  id="tc-mount"
                  className="form-select"
                  value={montaje}
                  onChange={(e) => setMontaje(e.target.value as MountType)}
                >
                  {Object.entries(MOUNT_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="tc-qty">Cantidad *</label>
                <input
                  id="tc-qty"
                  className="form-input"
                  type="number"
                  min={1}
                  max={50}
                  value={cantidad}
                  onChange={(e) => setCantidad(parseInt(e.target.value) || 0)}
                />
                <span className="form-hint">Entero entre 1 y 50</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tc-notes">Notas (opcional)</label>
              <input
                id="tc-notes"
                className="form-input"
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observaciones técnicas..."
                maxLength={300}
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="flex gap-2">
              <button className="btn btn--primary" onClick={handleAdd} style={{ flex: 1 }}>
                {editingOutletId ? '💾 Guardar Cambios' : '＋ Agregar Tomacorrientes'}
              </button>
              {editingOutletId && (
                <button className="btn btn--ghost" onClick={handleCancelEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Outlet List */}
      {outlets.length > 0 && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Circuito</th>
                <th>Tipo</th>
                <th>Montaje</th>
                <th style={{ textAlign: 'right' }}>Cantidad</th>
                <th>Notas</th>
                <th style={{ width: '50px' }} />
              </tr>
            </thead>
             <tbody>
               {outlets.map((outlet) => (
                 <tr key={outlet.id}>
                   <td className="text-sm">{getCircuitLabel(outlet.circuitoId)}</td>
                   <td>
                     <span className="badge badge--info">
                       {OUTLET_TYPE_LABELS[outlet.tipo]}
                     </span>
                   </td>
                   <td className="text-sm">{MOUNT_TYPE_LABELS[outlet.montaje]}</td>
                   <td className="data-table__number">{outlet.cantidad}</td>
                   <td className="text-sm">
                     {outlet.notas ? (
                       <div 
                         className="flex items-center gap-1 cursor-help" 
                         title={outlet.notas}
                         style={{ color: 'var(--color-primary-600)' }}
                       >
                         📝 <span className="text-truncate" style={{ maxWidth: '120px', display: 'inline-block' }}>{outlet.notas}</span>
                       </div>
                     ) : (
                       <span className="text-muted">—</span>
                     )}
                   </td>
                   <td>
                     <div className="flex gap-1">
                       <button
                         className="btn btn--ghost btn--sm"
                         onClick={() => handleEdit(outlet)}
                         title="Editar"
                       >✏️</button>
                       <button
                         className="btn btn--ghost btn--sm"
                         onClick={() => handleDelete(outlet.id)}
                         title="Eliminar"
                       >🗑️</button>
                     </div>
                   </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── BOM Tab ────────────────────────────────────────────

function BOMTab() {
  const {
    bomEntries,
    activeProject,
    bomSubtotal,
    bomTaxAmount,
    bomTotal,
    adjustBOMEntry,
    restoreBOMEntry,
    restoreAllBOM,
    adjustments,
    updateProject,
    recalculateBOM,
  } = useProjectStore();

  const [allMaterials, setAllMaterials] = useState<(Material | OfertaMaterial)[]>([]);
  const [viewCurrency, setViewCurrency] = useState<'USD' | 'CRC'>(activeProject?.moneda ?? 'USD');
  const [adjustingEntry, setAdjustingEntry] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustJustification, setAdjustJustification] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [historyEntry, setHistoryEntry] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      db.materials.toArray(),
      db.ofertas.toArray()
    ]).then(([mats, ofs]) => {
      setAllMaterials([...mats, ...ofs]);
    });
    if (activeProject && viewCurrency !== 'USD' && viewCurrency !== 'CRC') {
      setViewCurrency(activeProject.moneda);
    }
  }, [activeProject]);

  const getMaterial = useCallback(
    (id: string) => allMaterials.find((m) => m.id === id),
    [allMaterials]
  );

  const formatCurrency = (amount: number, forceCurrency?: 'USD' | 'CRC') => {
    const target = forceCurrency || viewCurrency;
    
    let finalAmount = amount;
    if (activeProject) {
       if (activeProject.moneda === 'USD' && target === 'CRC') {
         finalAmount = amount * (activeProject.tipoCambio || 500);
       } else if (activeProject.moneda === 'CRC' && target === 'USD') {
         finalAmount = amount / (activeProject.tipoCambio || 500);
       }
    }

    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: target,
      minimumFractionDigits: 2,
    }).format(finalAmount);
  };

  const handleStartAdjust = (entry: BOMEntry) => {
    setAdjustingEntry(entry.id);
    setAdjustQty(entry.cantidadAjustada);
    setAdjustJustification('');
    setAdjustError('');
  };

  const handleSaveAdjust = async () => {
    if (!adjustingEntry) return;

    if (adjustQty < 0) {
      setAdjustError('La cantidad debe ser mayor o igual a 0.');
      return;
    }

    if (adjustJustification.trim().length < 10) {
      setAdjustError('La justificación debe tener al menos 10 caracteres.');
      return;
    }

    await adjustBOMEntry(adjustingEntry, adjustQty, adjustJustification.trim());
    setAdjustingEntry(null);
  };

  const handleRestoreAll = async () => {
    const modified = bomEntries.filter((e) => e.cantidadAjustada !== e.cantidadEstimada).length;
    if (modified === 0) return;

    if (!confirm(`¿Restaurar ${modified} material(es) a la estimación base? Se creará un registro de ajuste para cada uno.`)) return;
    await restoreAllBOM();
  };

  const hasAdjustments = bomEntries.some((e) => e.cantidadAjustada !== e.cantidadEstimada);

  const entryAdjustments = historyEntry
    ? adjustments.filter((a) => a.bomId === historyEntry).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];

  return (
    <div>
      {bomEntries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📋</div>
          <h3 className="empty-state__title">BOM vacío</h3>
          <p className="empty-state__text">
            Agrega zonas, circuitos y tomacorrientes para generar la lista de materiales automáticamente.
          </p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="stats-grid mb-6">
            <div className="stat-card">
              <div className="stat-card__label">Subtotal</div>
              <div className="stat-card__value">{formatCurrency(bomSubtotal)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">
                Impuesto ({activeProject?.tasaImpuesto ?? 0}%)
              </div>
              <div className="stat-card__value">{formatCurrency(bomTaxAmount)}</div>
            </div>
            <div className="stat-card" style={{ borderColor: 'var(--color-primary-300)' }}>
              <div className="stat-card__label">Total</div>
              <div className="stat-card__value" style={{ color: 'var(--color-primary-600)' }}>
                {formatCurrency(bomTotal)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Materiales</div>
              <div className="stat-card__value">{bomEntries.length}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2 items-center">
              <span className="text-sm font-semibold text-muted">Ver en:</span>
              <div className="tabs" style={{ display: 'inline-flex', marginBottom: 0, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 2 }}>
                <button
                  className={`btn btn--sm ${viewCurrency === 'USD' ? 'btn--primary' : 'btn--ghost'}`}
                  style={{ borderRadius: 'var(--radius-sm)' }}
                  onClick={async () => {
                    setViewCurrency('USD');
                    if (activeProject) {
                      await updateProject(activeProject.id, { moneda: 'USD' });
                      await recalculateBOM();
                    }
                  }}
                >
                  🇺🇸 USD
                </button>
                <button
                  className={`btn btn--sm ${viewCurrency === 'CRC' ? 'btn--primary' : 'btn--ghost'}`}
                  style={{ borderRadius: 'var(--radius-sm)' }}
                  onClick={async () => {
                    setViewCurrency('CRC');
                    if (activeProject) {
                      await updateProject(activeProject.id, { moneda: 'CRC' });
                      await recalculateBOM();
                    }
                  }}
                >
                  🇨🇷 CRC
                </button>
              </div>
            </div>

            {hasAdjustments && (
              <div className="flex gap-4 items-center">
                <span className="text-sm text-muted">
                  {bomEntries.filter((e) => e.cantidadAjustada !== e.cantidadEstimada).length} material(es) con ajustes
                </span>
                <button className="btn btn--secondary btn--sm" onClick={handleRestoreAll}>
                  🔄 Restaurar Todo
                </button>
              </div>
            )}
          </div>

          {/* BOM Table */}
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Unidad</th>
                  <th style={{ textAlign: 'right' }}>Cant. Estimada</th>
                  <th style={{ textAlign: 'right' }}>Cant. Ajustada</th>
                  <th style={{ textAlign: 'right' }}>Δ</th>
                  <th style={{ textAlign: 'right' }}>Valor Unitario ({viewCurrency === 'USD' ? '$' : '₡'})</th>
                  <th style={{ textAlign: 'right' }}>Monto ({viewCurrency === 'USD' ? '$' : '₡'})</th>
                  <th style={{ textAlign: 'center', width: '50px' }}>Ref.</th>
                  <th style={{ width: '120px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {bomEntries.map((entry) => {
                  const material = getMaterial(entry.materialId);
                  const diff = entry.cantidadAjustada - entry.cantidadEstimada;
                  const subtotal = entry.cantidadAjustada * entry.precioUnitarioSnap;
                  const diffClass = diff > 0 ? 'data-table__diff--positive' : diff < 0 ? 'data-table__diff--negative' : 'data-table__diff--zero';
                  const hasAdjust = entry.cantidadAjustada !== entry.cantidadEstimada;

                  const hasLink = material?.enlaceReferencia && 
                                  material.enlaceReferencia.trim() !== '' && 
                                  material.enlaceReferencia.trim() !== '-' &&
                                  material.enlaceReferencia.trim() !== '—';
                  const isIncomplete = !hasLink;
                  const rowBg = isIncomplete ? 'rgba(239, 68, 68, 0.15)' : (hasAdjust ? 'var(--color-primary-50)' : undefined);

                  return (
                    <tr key={entry.id} style={{ backgroundColor: rowBg }}>
                      <td>
                        <div className="font-semibold text-sm">
                          {material?.descripcion ?? entry.materialId}
                        </div>
                        <div className="flex items-center gap-2" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                          <span>{material?.codigo ?? ''}</span>
                          {'proveedor' in (material || {}) && (
                            <span className="badge badge--borrador" style={{ textTransform: 'none', fontSize: '10px', padding: '0 4px' }}>
                              Oferta: {(material as OfertaMaterial).proveedor}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-sm">{material?.unidad ?? '—'}</td>
                      <td className="data-table__number">{entry.cantidadEstimada.toFixed(2)}</td>
                      <td className="data-table__number font-semibold">{entry.cantidadAjustada.toFixed(2)}</td>
                      <td className={`data-table__number ${diffClass}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                      </td>
                      <td className="data-table__number">{formatCurrency(entry.precioUnitarioSnap)}</td>
                      <td className="data-table__number font-semibold">{formatCurrency(subtotal)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {material?.enlaceReferencia ? (
                          <a 
                            href={material.enlaceReferencia.startsWith('http') ? material.enlaceReferencia : `https://${material.enlaceReferencia}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            title="Ver Referencia de Precio"
                            style={{ fontSize: '1.1rem', textDecoration: 'none' }}
                          >
                            🔗
                          </a>
                        ) : '—'}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn btn--ghost btn--sm"
                            title="Ajustar"
                            onClick={() => handleStartAdjust(entry)}
                          >✏️</button>
                          {hasAdjust && (
                            <button
                              className="btn btn--ghost btn--sm"
                              title="Restaurar"
                              onClick={() => restoreBOMEntry(entry.id)}
                            >🔄</button>
                          )}
                          <button
                            className="btn btn--ghost btn--sm"
                            title="Historial"
                            onClick={() => setHistoryEntry(historyEntry === entry.id ? null : entry.id)}
                          >📜</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: 'var(--space-4) var(--space-6)',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderTop: 'none',
            borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
          }}>
            <div style={{ textAlign: 'right' }}>
              <div className="text-sm text-muted">
                Subtotal: {formatCurrency(bomSubtotal)}
              </div>
              <div className="text-sm text-muted">
                Impuesto ({activeProject?.tasaImpuesto ?? 0}%): {formatCurrency(bomTaxAmount)}
              </div>
              <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' as never, color: 'var(--color-primary-600)', marginTop: 'var(--space-2)' }}>
                Total: {formatCurrency(bomTotal)}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Adjustment Modal */}
      {adjustingEntry && (
        <div className="modal-overlay" onClick={() => setAdjustingEntry(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal__header">
              <h2 className="modal__title">Ajustar Cantidad</h2>
              <p className="modal__subtitle">
                {getMaterial(bomEntries.find((e) => e.id === adjustingEntry)?.materialId ?? '')?.descripcion}
              </p>
            </div>
            <div className="modal__body">
              <div className="form-group">
                <label className="form-label" htmlFor="adjust-qty">Nueva Cantidad</label>
                <input
                  id="adjust-qty"
                  className="form-input"
                  type="number"
                  min={0}
                  step={0.01}
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="adjust-justification">Justificación *</label>
                <textarea
                  id="adjust-justification"
                  className="form-textarea"
                  value={adjustJustification}
                  onChange={(e) => setAdjustJustification(e.target.value)}
                  placeholder="Razón del ajuste (mínimo 10 caracteres)..."
                  minLength={10}
                  maxLength={500}
                  rows={3}
                />
                <span className="form-hint">{adjustJustification.length}/500 caracteres (mín. 10)</span>
              </div>
              {adjustError && <div className="form-error">{adjustError}</div>}
            </div>
            <div className="modal__footer">
              <button className="btn btn--secondary" onClick={() => setAdjustingEntry(null)}>Cancelar</button>
              <button className="btn btn--primary" onClick={handleSaveAdjust}>Guardar Ajuste</button>
            </div>
          </div>
        </div>
      )}

      {/* History Panel */}
      {historyEntry && entryAdjustments.length > 0 && (
        <div className="card mt-4">
          <div className="card__header">
            <h3 className="card__title">📜 Historial de Ajustes</h3>
            <button className="btn btn--ghost btn--sm" onClick={() => setHistoryEntry(null)}>✕</button>
          </div>
          <div className="flex-col gap-3">
            {entryAdjustments.map((adj, i) => (
              <div
                key={adj.id}
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  background: adj.esRestauracion ? 'var(--color-surface-50)' : 'var(--color-bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm">
                    #{entryAdjustments.length - i}
                    {adj.esRestauracion && <span className="badge badge--info" style={{ marginLeft: 'var(--space-2)' }}>Restauración</span>}
                  </span>
                  <span className="text-sm text-muted">
                    {new Date(adj.timestamp).toLocaleString('es-ES')}
                  </span>
                </div>
                <div className="text-sm mt-2">
                  <span className="data-table__diff--negative">{adj.cantidadAnterior.toFixed(2)}</span>
                  {' → '}
                  <span className="data-table__diff--positive">{adj.cantidadNueva.toFixed(2)}</span>
                </div>
                <p className="text-sm text-muted mt-2" style={{ fontStyle: 'italic' }}>
                  «{adj.justificacion}»
                </p>
              </div>
            ))}
          </div>
          {entryAdjustments.length === 0 && (
            <p className="text-sm text-muted">Sin ajustes registrados para este material.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Export Tab ──────────────────────────────────────────

function ExportarTab() {
  const { activeProject, bomEntries } = useProjectStore();
  const [isExporting, setIsExporting] = useState(false);
  const [includePrecios, setIncludePrecios] = useState(true);
  const [includeHistorial, setIncludeHistorial] = useState(false);

  const handleExportPDF = async () => {
    if (!activeProject || bomEntries.length === 0) return;
    setIsExporting(true);

    try {
      const { exportToPDF } = await import('../export/pdfExporter');
      const [mats, ofs] = await Promise.all([db.materials.toArray(), db.ofertas.toArray()]);
      const materials = [...mats, ...ofs];
      await exportToPDF(activeProject, bomEntries, materials, { includePrecios });
    } catch (err) {
      console.error('Export PDF error:', err);
      alert('No se pudo generar el PDF. Intente de nuevo o use el formato XLSX.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportXLSX = async () => {
    if (!activeProject || bomEntries.length === 0) return;
    setIsExporting(true);

    try {
      const { exportToXLSX } = await import('../export/xlsxExporter');
      const [mats, ofs] = await Promise.all([db.materials.toArray(), db.ofertas.toArray()]);
      const materials = [...mats, ...ofs];
      const adjustments = await db.adjustments.toArray();
      await exportToXLSX(activeProject, bomEntries, materials, adjustments, { includePrecios, includeHistorial });
    } catch (err) {
      console.error('Export XLSX error:', err);
      alert('Error al exportar XLSX.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!activeProject || bomEntries.length === 0) return;
    setIsExporting(true);

    try {
      const { exportToCSV } = await import('../export/csvExporter');
      const [mats, ofs] = await Promise.all([db.materials.toArray(), db.ofertas.toArray()]);
      const materials = [...mats, ...ofs];
      await exportToCSV(activeProject, bomEntries, materials);
    } catch (err) {
      console.error('Export CSV error:', err);
      alert('Error al exportar CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  const hasBOM = bomEntries.length > 0;

  return (
    <div style={{ maxWidth: '600px' }}>
      <div className="card mb-6">
        <h3 className="card__title" style={{ marginBottom: 'var(--space-4)' }}>
          Configuración de Exportación
        </h3>
        <div className="flex-col gap-4">
          <label className="flex items-center gap-3 text-sm" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includePrecios}
              onChange={(e) => setIncludePrecios(e.target.checked)}
            />
            Incluir precios y subtotales
          </label>
          <label className="flex items-center gap-3 text-sm" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeHistorial}
              onChange={(e) => setIncludeHistorial(e.target.checked)}
            />
            Incluir historial de ajustes (solo XLSX)
          </label>
        </div>
      </div>

      <div className="flex-col gap-4">
        <button
          className="btn btn--primary btn--lg w-full"
          onClick={handleExportPDF}
          disabled={!hasBOM || isExporting}
        >
          📄 Exportar PDF
        </button>
        <button
          className="btn btn--secondary btn--lg w-full"
          onClick={handleExportXLSX}
          disabled={!hasBOM || isExporting}
        >
          📊 Exportar XLSX
        </button>
        <button
          className="btn btn--secondary btn--lg w-full"
          onClick={handleExportCSV}
          disabled={!hasBOM || isExporting}
        >
          📁 Exportar CSV
        </button>
      </div>

      {!hasBOM && (
        <p className="text-sm text-muted mt-4" style={{ textAlign: 'center' }}>
          Agrega tomacorrientes para generar el BOM y habilitar la exportación.
        </p>
      )}

      {isExporting && (
        <div className="loading-state mt-6">
          <div className="spinner" />
        </div>
      )}
    </div>
  );
}

// ─── Project Editor Page ────────────────────────────────

export function ProjectEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    activeProject,
    loadProject,
    clearActiveProject,
    isLoading,
    error,
    outlets,
    zones,
  } = useProjectStore();

  const [activeTab, setActiveTab] = useState<TabId>('zonas');
  const lastSaved = useAutoSave();

  useEffect(() => {
    if (id) loadProject(id);
    return () => clearActiveProject();
  }, [id, loadProject, clearActiveProject]);

  if (isLoading) {
    return (
      <div className="loading-state" style={{ height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error || !activeProject) {
    return (
      <div className="empty-state" style={{ height: '100vh' }}>
        <div className="empty-state__icon">❌</div>
        <h3 className="empty-state__title">Proyecto no encontrado</h3>
        <p className="empty-state__text">{error ?? 'El proyecto solicitado no existe.'}</p>
        <button className="btn btn--primary" onClick={() => navigate('/')}>
          Volver a Proyectos
        </button>
      </div>
    );
  }

  const totalTCs = outlets.reduce((sum, o) => sum + o.cantidad, 0);
  const profile = getProfileById(activeProject.perfilNormativoId);

  const tabs: { id: TabId; label: string; badge?: string }[] = [
    { id: 'configuracion', label: 'Configuración' },
    { id: 'zonas', label: 'Zonas & Circuitos', badge: `${zones.length}` },
    { id: 'tomacorrientes', label: 'Tomacorrientes', badge: `${totalTCs}` },
    { id: 'bom', label: 'Lista de Materiales' },
    { id: 'exportar', label: 'Exportar' },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3">
            <button className="btn btn--ghost btn--sm" onClick={() => navigate('/')}>
              ← Proyectos
            </button>
          </div>
          <h1 className="page-header__title" style={{ marginTop: 'var(--space-1)' }}>
            {activeProject.nombre}
          </h1>
          <p className="page-header__subtitle">
            {activeProject.cliente && `${activeProject.cliente} · `}
            {profile?.nombre ?? activeProject.perfilNormativoId} · {activeProject.moneda}
            {lastSaved && (
              <span style={{ marginLeft: 'var(--space-4)', color: 'var(--color-success)' }}>
                ✓ Guardado
              </span>
            )}
          </p>
        </div>
        <div className="page-header__actions">
          <span className={`badge badge--${activeProject.estado.toLowerCase()}`}>
            {activeProject.estado}
          </span>
        </div>
      </div>

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.badge && (
              <span style={{
                marginLeft: 'var(--space-2)',
                padding: '1px 8px',
                background: 'var(--color-surface-100)',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--font-size-xs)',
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="page-body">
        {activeTab === 'configuracion' && <ConfiguracionTab />}
        {activeTab === 'zonas' && <ZonasTab />}
        {activeTab === 'tomacorrientes' && <TomacorrientesTab />}
        {activeTab === 'bom' && <BOMTab />}
        {activeTab === 'exportar' && <ExportarTab />}
      </div>
    </>
  );
}
