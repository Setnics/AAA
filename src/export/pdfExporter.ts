/**
 * SEITE — PDF Exporter
 *
 * Generates a styled PDF using jsPDF + autoTable.
 * Format per SRS §5.7 RF-13.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Project, BOMEntry, Material } from '../database/schema';

interface ExportOptions {
  includePrecios: boolean;
}

export async function exportToPDF(
  project: Project,
  bomEntries: BOMEntry[],
  materials: Material[],
  options: ExportOptions
): Promise<void> {
  const doc = new jsPDF();
  const materialMap = new Map(materials.map((m) => [m.id, m]));

  // ── Header ──
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SEITE — Estimación de Materiales', 14, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Proyecto: ${project.nombre}`, 14, 30);
  if (project.cliente) doc.text(`Cliente: ${project.cliente}`, 14, 36);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, project.cliente ? 42 : 36);
  doc.text(`Versión: ${project.versionActual}`, 14, project.cliente ? 48 : 42);
  doc.text(`Perfil Normativo: ${project.perfilNormativoId}`, 120, 30);
  doc.text(`Moneda: ${project.moneda}`, 120, 36);

  const startY = project.cliente ? 56 : 50;

  // ── BOM Table ──
  const headers = options.includePrecios
    ? ['Código', 'Material', 'Und', 'Cant. Est.', 'Cant. Aj.', 'Δ', 'P. Unit.', 'Subtotal']
    : ['Código', 'Material', 'Und', 'Cant. Est.', 'Cant. Aj.', 'Δ'];

  const rows = bomEntries.map((entry) => {
    const mat = materialMap.get(entry.materialId);
    const diff = entry.cantidadAjustada - entry.cantidadEstimada;
    const diffStr = diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);

    const baseRow = [
      mat?.codigo ?? entry.materialId,
      mat?.descripcion ?? '—',
      mat?.unidad ?? '—',
      entry.cantidadEstimada.toFixed(2),
      entry.cantidadAjustada.toFixed(2),
      diffStr,
    ];

    if (options.includePrecios) {
      baseRow.push(
        entry.precioUnitarioSnap.toFixed(2),
        (entry.cantidadAjustada * entry.precioUnitarioSnap).toFixed(2)
      );
    }

    return baseRow;
  });

  autoTable(doc, {
    startY,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [45, 125, 95],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [245, 243, 239],
    },
    columnStyles: options.includePrecios
      ? {
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right' },
        }
      : {
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
        },
    margin: { left: 14, right: 14 },
  });

  // ── Totals ──
  if (options.includePrecios) {
    const subtotal = bomEntries.reduce(
      (sum, e) => sum + e.cantidadAjustada * e.precioUnitarioSnap,
      0
    );
    const taxAmount = subtotal * (project.tasaImpuesto / 100);
    const total = subtotal + taxAmount;

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 250;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Subtotal: ${project.moneda} ${subtotal.toFixed(2)}`, 140, finalY + 10);
    doc.text(`Impuesto (${project.tasaImpuesto}%): ${project.moneda} ${taxAmount.toFixed(2)}`, 140, finalY + 16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${project.moneda} ${total.toFixed(2)}`, 140, finalY + 24);
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'Estimación generada con SEITE v2.0. Variaciones en conduit y cable de ±25–40% son esperadas. Validar con ingeniero eléctrico certificado.',
      14,
      doc.internal.pageSize.height - 10
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width - 30,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`${project.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_BOM.pdf`);
}
