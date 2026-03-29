/**
 * SEITE — CSV Exporter
 *
 * UTF-8 with BOM encoding per SRS §5.7 RF-13.
 */

import type { Project, BOMEntry, Material } from '../database/schema';

export async function exportToCSV(
  project: Project,
  bomEntries: BOMEntry[],
  materials: Material[]
): Promise<void> {
  const materialMap = new Map(materials.map((m) => [m.id, m]));

  const headers = [
    'codigo_material',
    'descripcion',
    'unidad',
    'cantidad_estimada',
    'cantidad_ajustada',
    'precio_unitario',
    'subtotal',
  ];

  const rows = bomEntries.map((entry) => {
    const mat = materialMap.get(entry.materialId);
    return [
      escapeCSV(mat?.codigo ?? entry.materialId),
      escapeCSV(mat?.descripcion ?? ''),
      escapeCSV(mat?.unidad ?? ''),
      entry.cantidadEstimada.toFixed(4),
      entry.cantidadAjustada.toFixed(4),
      entry.precioUnitarioSnap.toFixed(4),
      (entry.cantidadAjustada * entry.precioUnitarioSnap).toFixed(4),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');

  // UTF-8 BOM prefix for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${project.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_BOM.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
