/**
 * SEITE — XLSX Exporter
 *
 * Generates Excel file with formulas using SheetJS.
 * Format per SRS §5.7 RF-13.
 */

import * as XLSX from 'xlsx';
import type { Project, BOMEntry, Material, Adjustment } from '../database/schema';

interface ExportOptions {
  includePrecios: boolean;
  includeHistorial: boolean;
}

export async function exportToXLSX(
  project: Project,
  bomEntries: BOMEntry[],
  materials: Material[],
  adjustments: Adjustment[],
  options: ExportOptions
): Promise<void> {
  const materialMap = new Map(materials.map((m) => [m.id, m]));
  const workbook = XLSX.utils.book_new();

  // ── Sheet 1: BOM ──
  const bomHeaders = options.includePrecios
    ? ['Código', 'Descripción', 'Unidad', 'Cant. Estimada', 'Cant. Ajustada', 'Diferencia', 'P. Unitario', 'Subtotal']
    : ['Código', 'Descripción', 'Unidad', 'Cant. Estimada', 'Cant. Ajustada', 'Diferencia'];

  const bomData: (string | number)[][] = [bomHeaders];

  bomEntries.forEach((entry) => {
    const mat = materialMap.get(entry.materialId);
    const row: (string | number)[] = [
      mat?.codigo ?? entry.materialId,
      mat?.descripcion ?? '—',
      mat?.unidad ?? '—',
      entry.cantidadEstimada,
      entry.cantidadAjustada,
      entry.cantidadAjustada - entry.cantidadEstimada,
    ];

    if (options.includePrecios) {
      row.push(entry.precioUnitarioSnap);
      // Formula for subtotal: =E{row}*G{row} (adjusted * price)
      row.push(entry.cantidadAjustada * entry.precioUnitarioSnap);
    }

    bomData.push(row);
  });

  // Add totals row if prices included
  if (options.includePrecios) {

    const subtotal = bomEntries.reduce(
      (sum, e) => sum + e.cantidadAjustada * e.precioUnitarioSnap,
      0
    );
    const taxAmount = subtotal * (project.tasaImpuesto / 100);
    const total = subtotal + taxAmount;

    bomData.push([]);
    bomData.push(['', '', '', '', '', '', 'Subtotal:', subtotal]);
    bomData.push(['', '', '', '', '', '', `Impuesto (${project.tasaImpuesto}%):`, taxAmount]);
    bomData.push(['', '', '', '', '', '', 'TOTAL:', total]);
  }

  const bomSheet = XLSX.utils.aoa_to_sheet(bomData);

  // Set column widths
  bomSheet['!cols'] = [
    { wch: 18 }, // Código
    { wch: 40 }, // Descripción
    { wch: 8 },  // Unidad
    { wch: 14 }, // Cant. Estimada
    { wch: 14 }, // Cant. Ajustada
    { wch: 12 }, // Diferencia
    ...(options.includePrecios ? [{ wch: 14 }, { wch: 14 }] : []),
  ];

  XLSX.utils.book_append_sheet(workbook, bomSheet, 'BOM');

  // ── Sheet 2: Historial de Ajustes (optional) ──
  if (options.includeHistorial && adjustments.length > 0) {
    const adjustHeaders = ['Material', 'Fecha', 'Cant. Anterior', 'Cant. Nueva', 'Justificación', 'Restauración'];
    const adjustData: (string | number | boolean)[][] = [adjustHeaders];

    for (const adj of adjustments) {
      const bomEntry = bomEntries.find((e) => e.id === adj.bomId);
      const mat = bomEntry ? materialMap.get(bomEntry.materialId) : null;

      adjustData.push([
        mat?.descripcion ?? adj.bomId,
        new Date(adj.timestamp).toLocaleString('es-ES'),
        adj.cantidadAnterior,
        adj.cantidadNueva,
        adj.justificacion,
        adj.esRestauracion ? 'Sí' : 'No',
      ]);
    }

    const adjustSheet = XLSX.utils.aoa_to_sheet(adjustData);
    adjustSheet['!cols'] = [
      { wch: 35 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 50 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(workbook, adjustSheet, 'Historial Ajustes');
  }

  // ── Sheet 3: Metadatos ──
  const metaData = [
    ['Proyecto', project.nombre],
    ['Cliente', project.cliente || '—'],
    ['Ubicación', project.ubicacion || '—'],
    ['Perfil Normativo', project.perfilNormativoId],
    ['Moneda', project.moneda],
    ['Tasa Impuesto', `${project.tasaImpuesto}%`],
    ['Estado', project.estado],
    ['Versión', project.versionActual],
    ['Fecha de Exportación', new Date().toLocaleString('es-ES')],
    [],
    ['Generado por', 'SEITE v2.0'],
    ['Advertencia', 'Variaciones en conduit y cable de ±25–40% son esperadas. Validar con ingeniero eléctrico certificado.'],
  ];

  const metaSheet = XLSX.utils.aoa_to_sheet(metaData);
  metaSheet['!cols'] = [{ wch: 20 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(workbook, metaSheet, 'Metadatos');

  // Save
  XLSX.writeFile(workbook, `${project.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_BOM.xlsx`);
}
