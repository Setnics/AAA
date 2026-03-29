/**
 * SEITE — Materials Catalog Page
 *
 * CRUD for materials catalog per SRS §5.8 RF-14.
 */

import { useEffect, useState, useMemo } from 'react';
import { db } from '../database/db';
import type { Material, MaterialCategory, MaterialUnit, OfertaMaterial } from '../database/schema';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';
import { useProjectStore } from '../stores/projectStore';

const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  CONDUCTOR: 'Conductor',
  CANALETA: 'Canaleta',
  CAJA: 'Caja',
  ACCESORIO: 'Accesorio',
  PROTECCION: 'Protección',
  ACABADO: 'Acabado',
  TIERRA: 'Puesta a Tierra',
  TUBERIA: 'Tubería y Conduit',
  CONECTOR: 'Conectores y Terminales',
};

const UNIT_LABELS: Record<MaterialUnit, string> = {
  UN: 'Unidad',
  ML: 'Metro Lineal',
  M: 'Metro',
  ROLLO: 'Rollo',
  CAJA: 'Caja',
};

export function Catalog() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [ofertas, setOfertas] = useState<OfertaMaterial[]>([]);
  const [activeTab, setActiveTab] = useState<'oficial' | 'ofertas'>('oficial');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [showInactive, setShowInactive] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | OfertaMaterial | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Form state
  const [formCodigo, setFormCodigo] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formUnidad, setFormUnidad] = useState<MaterialUnit>('UN');
  const [formPrecio, setFormPrecio] = useState(0);
  const [formMoneda, setFormMoneda] = useState('USD');
  const [formCategoria, setFormCategoria] = useState<MaterialCategory>('ACCESORIO');
  const [formEnlace, setFormEnlace] = useState('');
  const [formProveedor, setFormProveedor] = useState('');
  const [formIncluyeIVA, setFormIncluyeIVA] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const loadMaterials = async () => {
    setIsLoading(true);
    const [mats, ofs] = await Promise.all([
      db.materials.toArray(),
      db.ofertas.toArray(),
    ]);
    setMaterials(mats);
    setOfertas(ofs);
    setIsLoading(false);
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const filtered = useMemo(() => {
    const list = activeTab === 'oficial' ? materials : ofertas;
    return list.filter((m) => {
      if (!showInactive && !m.activo) return false;
      if (filterCategory !== 'ALL' && m.categoria !== filterCategory) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          m.codigo.toLowerCase().includes(s) ||
          m.descripcion.toLowerCase().includes(s) ||
          (activeTab === 'ofertas' && (m as OfertaMaterial).proveedor?.toLowerCase().includes(s))
        );
      }
      return true;
    });
  }, [materials, ofertas, search, filterCategory, showInactive, activeTab]);

  const handleNew = () => {
    setIsNew(true);
    setFormCodigo('');
    setFormDescripcion('');
    setFormUnidad('UN');
    setFormPrecio(0);
    setFormMoneda('USD');
    setFormCategoria('ACCESORIO');
    setFormEnlace('');
    setFormProveedor('');
    setFormIncluyeIVA(false);
    setFormError('');
    setEditingMaterial({} as Material);
  };

  const handleEdit = (mat: Material | OfertaMaterial) => {
    setIsNew(false);
    setEditingMaterial(mat);
    setFormCodigo(mat.codigo);
    setFormDescripcion(mat.descripcion);
    setFormUnidad(mat.unidad);
    setFormPrecio(mat.precioUnitario);
    setFormMoneda(mat.monedaCatalogo);
    setFormCategoria(mat.categoria);
    setFormEnlace(mat.enlaceReferencia || '');
    setFormProveedor('proveedor' in mat ? mat.proveedor || '' : '');
    setFormIncluyeIVA(false); // Siempre reseteamos al editar, ya que el valor se guarda sin IVA
    setFormError('');
  };

  const handleSave = async () => {
    setFormError('');

    if (!formCodigo.trim()) {
      setFormError('El código es requerido.');
      return;
    }
    if (!formDescripcion.trim()) {
      setFormError('La descripción es requerida.');
      return;
    }
    if (formPrecio < 0) {
      setFormError('El precio debe ser mayor o igual a 0.');
      return;
    }

    const finalPrecio = formIncluyeIVA ? formPrecio / 1.13 : formPrecio;

    // Check code uniqueness
    if (isNew) {
      const existingList = activeTab === 'oficial' ? materials : ofertas;
      const existing = existingList.find(
        (m) => m.codigo.toLowerCase() === formCodigo.trim().toLowerCase()
      );
      if (existing) {
        setFormError(`El código «${formCodigo}» ya existe en esta lista.`);
        return;
      }
    }

    if (isNew) {
      const baseObj = {
        id: uuidv4(),
        codigo: formCodigo.trim(),
        descripcion: formDescripcion.trim(),
        unidad: formUnidad,
        precioUnitario: finalPrecio,
        monedaCatalogo: formMoneda as 'USD' | 'CRC',
        activo: true,
        categoria: formCategoria,
        enlaceReferencia: formEnlace.trim() || undefined,
        creadoEn: new Date().toISOString(),
      };

      if (activeTab === 'oficial') {
        await db.materials.add(baseObj as Material);
      } else {
        await db.ofertas.add({ ...baseObj, proveedor: formProveedor.trim() } as OfertaMaterial);
      }
    } else if (editingMaterial) {
      const updates = {
        descripcion: formDescripcion.trim(),
        unidad: formUnidad,
        precioUnitario: finalPrecio,
        monedaCatalogo: formMoneda as 'USD' | 'CRC',
        categoria: formCategoria,
        enlaceReferencia: formEnlace.trim() || undefined,
      };
      
      if (activeTab === 'oficial') {
        await db.materials.update(editingMaterial.id, updates);
      } else {
        await db.ofertas.update(editingMaterial.id, { ...updates, proveedor: formProveedor.trim() });
      }
    }

    setEditingMaterial(null);
    await loadMaterials();
  };

  const handleToggleActive = async (mat: Material) => {
    await db.materials.update(mat.id, { activo: !mat.activo });
    await loadMaterials();
  };

  const handleSyncCloud = async () => {
    if (!confirm('¿Actualizar el catálogo local con los precios más recientes de la nube?\nEsto sobreescribirá precios y enlaces de materiales existentes.')) return;

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.from('materiales').select('*');
      if (error) throw error;

      if (!data || data.length === 0) {
        alert('No se encontraron materiales en la nube.');
        return;
      }

      // Mapear materiales existentes por codigo (clave de negocio estable)
      const existingMats = await db.materials.toArray();
      const existingByCode = new Map(existingMats.map(m => [m.codigo, m]));

      const toUpsert: Material[] = data.map((remote) => {
        const existing = existingByCode.get(remote.codigo);
        // Preservar el ID local si ya existe, para no romper BOMEntries existentes
        const stableId = existing?.id ?? remote.id;
        return {
          id: stableId,
          codigo: remote.codigo,
          descripcion: remote.descripcion,
          unidad: remote.unidad as MaterialUnit,
          precioUnitario: Number(remote.precio_unitario) || 0,
          monedaCatalogo: (remote.moneda_catalogo || 'USD') as 'USD' | 'CRC',
          categoria: remote.categoria as MaterialCategory,
          activo: remote.activo ?? true,
          enlaceReferencia: remote.enlace_referencia || undefined,
          creadoEn: remote.creado_en || new Date().toISOString(),
          estadoPrecio: (remote.estado_precio || 'actualizado') as Material['estadoPrecio'],
          actualizadoEn: remote.actualizado_en || undefined,
        };
      });

      await db.materials.bulkPut(toUpsert);
      await loadMaterials();

      // Recalcular BOM del proyecto activo para reflejar nuevos precios
      const { activeProject, recalculateBOM } = useProjectStore.getState();
      if (activeProject) {
        await recalculateBOM();
      }

      alert(`Catálogo actualizado. ${toUpsert.length} materiales sincronizados desde la nube.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error syncing:', err);
      alert('Error sincronizando con la nube: ' + message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="flex-col gap-1">
          <h1 className="page-header__title">Catálogo de Materiales</h1>
          <p className="text-sm text-warning" style={{ fontWeight: '500' }}>
            ⚠️ Todos los precios mostrados deben interpretarse <strong>Sin IVA</strong>.
          </p>
        </div>
          <p className="page-header__subtitle">
            {materials.filter((m) => m.activo).length} materiales activos
          </p>
        </div>
        <div className="page-header__actions flex gap-3">
          <button className="btn btn--secondary" onClick={handleSyncCloud} disabled={isSyncing} title="Actualizar precios y datos desde la base de datos en la nube">
            {isSyncing ? 'Sincronizando...' : '☁️ Actualizar desde Nube'}
          </button>
          <button className="btn btn--primary" onClick={handleNew}>
            ＋ Nuevo Material
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="tabs mb-6">
          <button
            className={`tab ${activeTab === 'oficial' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('oficial')}
          >
            Oficial (Nube)
          </button>
          <button
            className={`tab ${activeTab === 'ofertas' ? 'tab--active' : ''}`}
            onClick={() => setActiveTab('ofertas')}
          >
            Ofertas Recibidas
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6" style={{ flexWrap: 'wrap' }}>
          <input
            className="form-input"
            type="text"
            placeholder="Buscar por código o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: '300px' }}
          />
          <select
            className="form-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ maxWidth: '180px' }}
          >
            <option value="ALL">Todas las categorías</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Mostrar inactivos
          </label>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">📦</div>
            <h3 className="empty-state__title">Sin materiales</h3>
            <p className="empty-state__text">
              {search ? 'No se encontraron materiales con ese criterio.' : 'El catálogo está vacío.'}
            </p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  {activeTab === 'ofertas' && <th>Proveedor</th>}
                  <th>Categoría</th>
                  <th>Unidad</th>
                  <th style={{ textAlign: 'right' }}>Precio</th>
                  <th style={{ textAlign: 'center' }}>Link</th>
                  <th>Estado</th>
                  <th style={{ width: '100px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((mat) => {
                  const hasLink = mat.enlaceReferencia && 
                                  mat.enlaceReferencia.trim() !== '' && 
                                  mat.enlaceReferencia.trim() !== '-' &&
                                  mat.enlaceReferencia.trim() !== '—';
                  const isNoLink = !hasLink;
                  const isNoEncontrado = mat.estadoPrecio === 'no_encontrado';
                  const isIncomplete = isNoLink || isNoEncontrado;
                  const rowBg = isNoEncontrado
                    ? 'rgba(239, 68, 68, 0.18)'
                    : isNoLink
                    ? 'rgba(239, 68, 68, 0.08)'
                    : undefined;
                  return (
                    <tr 
                      key={mat.id} 
                      style={{ 
                        opacity: !mat.activo ? 0.5 : 1,
                        backgroundColor: rowBg,
                      }}
                    >
                      <td className="font-semibold text-sm">
                        {mat.codigo}
                        {isNoEncontrado && (
                          <div className="text-danger" style={{ fontSize: '10px', fontWeight: 600 }}
                            title="El sondeo semanal automático no encontró este material en ningún proveedor">
                            🔴 No encontrado en sondeo
                          </div>
                        )}
                        {!isNoEncontrado && isNoLink && (
                          <div className="text-danger" style={{ fontSize: '10px' }}>⚠️ Sin Referencia</div>
                        )}
                      </td>
                      <td className="text-sm">{mat.descripcion}</td>
                      {activeTab === 'ofertas' && (
                        <td className="text-sm text-muted">{(mat as OfertaMaterial).proveedor || '-'}</td>
                      )}
                      <td>
                        <span className="badge badge--info">{CATEGORY_LABELS[mat.categoria]}</span>
                      </td>
                      <td className="text-sm">{UNIT_LABELS[mat.unidad]}</td>
                      <td className={`data-table__number ${isIncomplete ? 'text-danger font-bold' : ''}`}>
                        {mat.monedaCatalogo} {isIncomplete ? '0.00' : mat.precioUnitario.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {mat.enlaceReferencia ? (
                          <a 
                            href={mat.enlaceReferencia.startsWith('http') ? mat.enlaceReferencia : `https://${mat.enlaceReferencia}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn--ghost btn--sm" 
                            title={mat.enlaceReferencia}
                            style={{ color: 'var(--color-primary-600)', textDecoration: 'underline' }}
                          >
                            🔗 Ver
                          </a>
                        ) : (
                          <span className="text-danger text-sm font-bold">REQUERIDO</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${mat.activo ? 'badge--success' : 'badge--danger'}`}>
                          {mat.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => handleEdit(mat)}
                        >✏️</button>
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => handleToggleActive(mat)}
                          title={mat.activo ? 'Desactivar' : 'Activar'}
                        >
                          {mat.activo ? '🚫' : '✅'}
                        </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit/New Modal */}
      {editingMaterial && (
        <div className="modal-overlay" onClick={() => setEditingMaterial(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">
                {isNew ? 'Nuevo Material' : 'Editar Material'}
              </h2>
            </div>
            <div className="modal__body">
              <div className="form-group">
                <label className="form-label" htmlFor="mat-code">Código *</label>
                <input
                  id="mat-code"
                  className="form-input"
                  value={formCodigo}
                  onChange={(e) => setFormCodigo(e.target.value)}
                  disabled={!isNew}
                  maxLength={50}
                  placeholder="Ej: CAB-14-THHN-F"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="mat-desc">Descripción *</label>
                <input
                  id="mat-desc"
                  className="form-input"
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  maxLength={200}
                  placeholder="Nombre descriptivo del material"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="mat-cat">Categoría</label>
                  <select
                    id="mat-cat"
                    className="form-select"
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value as MaterialCategory)}
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="mat-unit">Unidad</label>
                  <select
                    id="mat-unit"
                    className="form-select"
                    value={formUnidad}
                    onChange={(e) => setFormUnidad(e.target.value as MaterialUnit)}
                  >
                    {Object.entries(UNIT_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {activeTab === 'ofertas' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="mat-prov">Nombre del Proveedor</label>
                  <input
                    id="mat-prov"
                    className="form-input"
                    value={formProveedor}
                    onChange={(e) => setFormProveedor(e.target.value)}
                    maxLength={100}
                    placeholder="Ej: Proveedor XYZ"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="mat-link">Enlace de Referencia</label>
                <input
                  id="mat-link"
                  className="form-input"
                  type="url"
                  value={formEnlace}
                  onChange={(e) => setFormEnlace(e.target.value)}
                  placeholder="https://pagina.com/producto"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="mat-price">Precio Unitario (Sin IVA) *</label>
                  <input
                    id="mat-price"
                    className="form-input"
                    type="number"
                    min={0}
                    step={0.01}
                    value={formPrecio}
                    onChange={(e) => setFormPrecio(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                  <small className="form-help">Ingresa el precio sin incluir impuestos</small>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="mat-currency">Moneda Original *</label>
                  <select
                    id="mat-currency"
                    className="form-select"
                    value={formMoneda}
                    onChange={(e) => setFormMoneda(e.target.value)}
                  >
                    <option value="USD">USD - Dólares</option>
                    <option value="CRC">CRC - Colones</option>
                  </select>
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formIncluyeIVA}
                    onChange={(e) => setFormIncluyeIVA(e.target.checked)}
                  />
                  <span className="text-sm font-medium">El precio ingresado incluye IVA (13%)</span>
                </label>
                <p className="text-xs text-muted" style={{ marginTop: 'var(--space-1)' }}>
                  Si se marca, el sistema dividirá el precio por 1.13 automáticamente antes de guardar. 
                  Todos los precios en el catálogo se almacenan siempre como Base Imponible.
                </p>
              </div>

              {formError && <div className="form-error">{formError}</div>}
            </div>
            <div className="modal__footer">
              <button className="btn btn--secondary" onClick={() => setEditingMaterial(null)}>
                Cancelar
              </button>
              <button className="btn btn--primary" onClick={handleSave}>
                {isNew ? 'Crear Material' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
