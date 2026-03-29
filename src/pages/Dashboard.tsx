/**
 * SEITE — Dashboard Page
 *
 * Project list view with card grid, new project creation,
 * and project actions (duplicate, delete).
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { getAllProfiles } from '../database/normativeProfiles';
import type { ProjectStatus } from '../database/schema';

// ─── Status Badge Helper ────────────────────────────────

function StatusBadge({ status }: { status: ProjectStatus }) {
  const classMap: Record<ProjectStatus, string> = {
    BORRADOR: 'badge badge--borrador',
    FINALIZADO: 'badge badge--finalizado',
    ARCHIVADO: 'badge badge--archivado',
  };

  const labelMap: Record<ProjectStatus, string> = {
    BORRADOR: 'Borrador',
    FINALIZADO: 'Finalizado',
    ARCHIVADO: 'Archivado',
  };

  return <span className={classMap[status]}>{labelMap[status]}</span>;
}

// ─── New Project Modal ──────────────────────────────────

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    nombre: string;
    descripcion: string;
    cliente: string;
    ubicacion: string;
    perfilNormativoId: string;
    tipoCambio: number;
    tasaImpuesto: number;
  }) => void;
}

function NewProjectModal({ isOpen, onClose, onSubmit }: NewProjectModalProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cliente, setCliente] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [perfilNormativoId, setPerfilNormativoId] = useState('NEC-2020-NCR');
  const [tipoCambio, setTipoCambio] = useState(500);
  const [tasaImpuesto, setTasaImpuesto] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const profiles = getAllProfiles();

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!nombre.trim()) {
      newErrors.nombre = 'Requerido';
    }

    if (tasaImpuesto < 0 || tasaImpuesto > 100) {
      newErrors.tasaImpuesto = 'La tasa de impuesto debe estar entre 0.00% y 100.00%.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onSubmit({
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      cliente: cliente.trim(),
      ubicacion: ubicacion.trim(),
      perfilNormativoId,
      tipoCambio,
      tasaImpuesto,
    });

    // Reset form
    setNombre('');
    setDescripcion('');
    setCliente('');
    setUbicacion('');
    setPerfilNormativoId('NEC-2020-NCR');
    setTipoCambio(500);
    setTasaImpuesto(0);
    setErrors({});
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Nuevo Proyecto</h2>
          <p className="modal__subtitle">Crea una nueva estimación eléctrica</p>
        </div>

        <div className="modal__body">
          <div className="form-group">
            <label className="form-label" htmlFor="project-name">Nombre del Proyecto *</label>
            <input
              id="project-name"
              className={`form-input ${errors.nombre ? 'form-input--error' : ''}`}
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Oficina Central - Planta Baja"
              maxLength={150}
            />
            {errors.nombre && <span className="form-error">{errors.nombre}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="project-desc">Descripción</label>
            <textarea
              id="project-desc"
              className="form-textarea"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción opcional del proyecto"
              maxLength={500}
              rows={2}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="project-client">Cliente</label>
              <input
                id="project-client"
                className="form-input"
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nombre del cliente"
                maxLength={200}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="project-location">Ubicación</label>
              <input
                id="project-location"
                className="form-input"
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="Dirección o sitio"
                maxLength={300}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="project-profile">Perfil Normativo *</label>
              <select
                id="project-profile"
                className="form-select"
                value={perfilNormativoId}
                onChange={(e) => setPerfilNormativoId(e.target.value)}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="project-tc">Tipo de Cambio</label>
              <input
                id="project-tc"
                className="form-input"
                type="number"
                min={1}
                value={tipoCambio}
                onChange={(e) => setTipoCambio(parseFloat(e.target.value) || 1)}
                placeholder="Ej: 500"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="project-tax">Tasa de Impuesto (%) *</label>
            <input
              id="project-tax"
              className={`form-input ${errors.tasaImpuesto ? 'form-input--error' : ''}`}
              type="number"
              value={tasaImpuesto}
              onChange={(e) => setTasaImpuesto(parseFloat(e.target.value) || 0)}
              min={0}
              max={100}
              step={0.01}
              style={{ maxWidth: '200px' }}
            />
            {errors.tasaImpuesto && <span className="form-error">{errors.tasaImpuesto}</span>}
          </div>
        </div>

        <div className="modal__footer">
          <button className="btn btn--secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn--primary" onClick={handleSubmit}>
            Crear Proyecto
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ──────────────────────────

function ConfirmDeleteModal({
  isOpen,
  projectName,
  isFinalizado,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  projectName: string;
  isFinalizado: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div className="modal__header">
          <h2 className="modal__title">⚠️ Eliminar Proyecto</h2>
        </div>
        <div className="modal__body">
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Eliminar el proyecto <strong>«{projectName}»</strong>? Esta acción es irreversible.
          </p>
          {isFinalizado && (
            <p style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-danger)',
              fontWeight: 'var(--font-weight-semibold)' as never,
              marginTop: 'var(--space-2)',
            }}>
              Este proyecto está marcado como Finalizado. ¿Está seguro?
            </p>
          )}
        </div>
        <div className="modal__footer">
          <button className="btn btn--secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn btn--danger" onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Page ─────────────────────────────────────

export function Dashboard() {
  const navigate = useNavigate();
  const {
    projects,
    loadProjects,
    createProject,
    duplicateProject,
    deleteProject,
    isLoading,
  } = useProjectStore();

  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nombre: string; estado: ProjectStatus } | null>(null);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreateProject = async (data: Parameters<typeof createProject>[0]) => {
    const project = await createProject({ ...data, moneda: 'USD' });
    setShowNewModal(false);
    navigate(`/proyecto/${project.id}`);
  };

  const handleDuplicate = async (id: string) => {
    await duplicateProject(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteProject(deleteTarget.id);
    setDeleteTarget(null);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Proyectos</h1>
          <p className="page-header__subtitle">
            Gestiona tus estimaciones de instalaciones eléctricas
          </p>
        </div>
        <div className="page-header__actions">
          <button
            className="btn btn--primary btn--lg"
            onClick={() => setShowNewModal(true)}
          >
            ＋ Nuevo Proyecto
          </button>
        </div>
      </div>

      <div className="page-body">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner" />
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">⚡</div>
            <h3 className="empty-state__title">Sin proyectos aún</h3>
            <p className="empty-state__text">
              Crea tu primer proyecto de estimación eléctrica para comenzar a
              calcular materiales.
            </p>
            <button
              className="btn btn--primary btn--lg"
              onClick={() => setShowNewModal(true)}
            >
              ＋ Crear Primer Proyecto
            </button>
          </div>
        ) : (
          <div className="project-grid">
            {projects
              .sort((a, b) => new Date(b.modificadoEn).getTime() - new Date(a.modificadoEn).getTime())
              .map((project) => (
                <div
                  key={project.id}
                  className="card card--clickable"
                  onClick={() => navigate(`/proyecto/${project.id}`)}
                >
                  <div className="card__header">
                    <div>
                      <h3 className="card__title">{project.nombre}</h3>
                      {project.cliente && (
                        <p className="card__subtitle">{project.cliente}</p>
                      )}
                    </div>
                    <StatusBadge status={project.estado} />
                  </div>

                  {project.descripcion && (
                    <div className="card__body truncate">{project.descripcion}</div>
                  )}

                  <div className="card__footer">
                    <span className="text-sm text-muted">
                      {formatDate(project.modificadoEn)}
                    </span>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn--ghost btn--sm"
                        title="Duplicar"
                        onClick={() => handleDuplicate(project.id)}
                      >
                        📋
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        title="Eliminar"
                        onClick={() =>
                          setDeleteTarget({
                            id: project.id,
                            nombre: project.nombre,
                            estado: project.estado,
                          })
                        }
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <NewProjectModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSubmit={handleCreateProject}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        projectName={deleteTarget?.nombre ?? ''}
        isFinalizado={deleteTarget?.estado === 'FINALIZADO'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
