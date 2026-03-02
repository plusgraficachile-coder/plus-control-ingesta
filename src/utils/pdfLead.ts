// ============================================================
// src/utils/pdfLead.ts
// Generador de Ficha de Prospecto para leads del Radar de Negocios
// Misma estética que pdfQuote.ts
// ============================================================

import { LOGO_BASE64 } from './logo';

const FORMATTER = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 0,
});

interface Lead {
  id: string;
  folio: string;
  nombre_negocio: string;
  rubro: string;
  ciudad: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  url_website?: string;
  iv?: number;
  nc?: number;
  score_total?: number;
  capacidad_pago?: string;
  urgencia_nivel: number;
  estado: string;
  ticket_estimado?: number;
  gap_coherencia?: string;
  argumento_venta?: string;
  created_at: string;
  auditado_at?: string;
}

const getScoreColor = (score?: number): [number, number, number] => {
  if (!score) return [75, 85, 99];     // Gris
  if (score >= 80) return [239, 68, 68];  // Rojo
  if (score >= 60) return [245, 158, 11]; // Ámbar
  if (score >= 40) return [16, 185, 129]; // Verde
  return [107, 114, 128];               // Gris oscuro
};

const urgenciaLabel = (nivel: number): string => {
  const labels = ['Muy baja', 'Baja', 'Media', 'Alta', 'Muy alta'];
  return labels[nivel - 1] || 'Media';
};

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export const generarPDFLead = async (lead: Lead): Promise<void> => {
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF();
  const CYAN: [number, number, number] = [6, 182, 212];
  const DARK: [number, number, number] = [17, 24, 39];
  const GRAY: [number, number, number] = [100, 116, 139];

  // -----------------------------------------------------------------------
  // 1. ENCABEZADO
  // -----------------------------------------------------------------------
  if (LOGO_BASE64) {
    try {
      doc.addImage(LOGO_BASE64, 'PNG', 14, 10, 0, 20);
    } catch {
      doc.setFontSize(22);
      doc.setTextColor(...CYAN);
      doc.setFont('helvetica', 'bold');
      doc.text('PlusGráfica SpA', 14, 22);
    }
  } else {
    doc.setFontSize(22);
    doc.setTextColor(...CYAN);
    doc.setFont('helvetica', 'bold');
    doc.text('PlusGráfica SpA', 14, 22);
  }

  // Datos empresa
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.text('Plus Gráfica SpA  |  RUT: 76.910.073-3  |  Temuco, Araucanía', 14, 40);
  doc.text('contacto@plusgrafica.cl  |  www.plusgrafica.cl', 14, 45);

  // Folio y fecha (derecha)
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text('FICHA DE PROSPECTO', 140, 22);

  doc.setFontSize(13);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.text(`#${lead.folio || lead.id.slice(0, 8).toUpperCase()}`, 170, 22);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('GENERADO', 140, 32);
  doc.setTextColor(...DARK);
  doc.text(formatDate(new Date().toISOString()), 170, 32);

  if (lead.auditado_at) {
    doc.setTextColor(...GRAY);
    doc.text('AUDITADO', 140, 39);
    doc.setTextColor(...DARK);
    doc.text(formatDate(lead.auditado_at), 170, 39);
  }

  // -----------------------------------------------------------------------
  // 2. BLOQUE PRINCIPAL DEL NEGOCIO
  // -----------------------------------------------------------------------
  const boxY = 55;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, boxY, 182, 38, 3, 3, 'FD');

  // Barra lateral cyan
  doc.setFillColor(...CYAN);
  doc.roundedRect(14, boxY, 4, 38, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setTextColor(...CYAN);
  doc.setFont('helvetica', 'bold');
  doc.text('PROSPECTO', 23, boxY + 8);

  doc.setFontSize(14);
  doc.setTextColor(...DARK);
  doc.text(lead.nombre_negocio.toUpperCase(), 23, boxY + 17);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(`${lead.rubro}  ·  ${lead.ciudad}`, 23, boxY + 24);
  if (lead.direccion) doc.text(lead.direccion, 23, boxY + 30);

  // Score (derecha del bloque)
  if (lead.score_total !== undefined) {
    const scoreColor = getScoreColor(lead.score_total);
    doc.setFillColor(...scoreColor);
    doc.roundedRect(163, boxY + 6, 28, 22, 3, 3, 'F');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(String(lead.score_total), 177, boxY + 21, { align: 'center' });
    doc.setFontSize(7);
    doc.text('SCORE', 177, boxY + 31, { align: 'center' });
  }

  // -----------------------------------------------------------------------
  // 3. INDICADORES (Fila de métricas)
  // -----------------------------------------------------------------------
  const metricsY = boxY + 48;
  const cols = [14, 65, 116, 155];

  const metricas = [
    { label: 'TICKET ESTIMADO', value: lead.ticket_estimado ? FORMATTER.format(lead.ticket_estimado) : '-' },
    { label: 'MARGEN EST. (35%)', value: lead.ticket_estimado ? FORMATTER.format(Math.round(lead.ticket_estimado * 0.35)) : '-' },
    { label: 'URGENCIA', value: urgenciaLabel(lead.urgencia_nivel) },
    { label: 'CAPACIDAD PAGO', value: lead.capacidad_pago || '-' },
  ];

  metricas.forEach((m, i) => {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(cols[i], metricsY, i < 2 ? 46 : i === 2 ? 34 : 34, 20, 2, 2, 'FD');

    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text(m.label, cols[i] + (i < 2 ? 23 : 17), metricsY + 6, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(m.value, cols[i] + (i < 2 ? 23 : 17), metricsY + 14, { align: 'center' });
  });

  // -----------------------------------------------------------------------
  // 4. CONTACTO
  // -----------------------------------------------------------------------
  let currentY = metricsY + 30;

  const contactos = [
    lead.telefono && `📱 ${lead.telefono}`,
    lead.email && `✉ ${lead.email}`,
    lead.url_website && `🌐 ${lead.url_website}`,
  ].filter(Boolean) as string[];

  if (contactos.length > 0) {
    doc.setFontSize(8);
    doc.setTextColor(...CYAN);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTACTO', 14, currentY);

    doc.setLineWidth(0.3);
    doc.setDrawColor(...CYAN);
    doc.line(14, currentY + 2, 196, currentY + 2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    contactos.forEach((c, i) => {
      doc.text(c, 14, currentY + 9 + i * 6);
    });

    currentY += 12 + contactos.length * 6;
  }

  // -----------------------------------------------------------------------
  // 5. GAP DE COHERENCIA
  // -----------------------------------------------------------------------
  if (lead.gap_coherencia) {
    currentY += 4;
    doc.setFontSize(8);
    doc.setTextColor(...CYAN);
    doc.setFont('helvetica', 'bold');
    doc.text('GAP DETECTADO', 14, currentY);
    doc.setLineWidth(0.3);
    doc.setDrawColor(...CYAN);
    doc.line(14, currentY + 2, 196, currentY + 2);

    const lines = doc.splitTextToSize(lead.gap_coherencia, 178);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(lines, 14, currentY + 8);

    currentY += 10 + lines.length * 5;
  }

  // -----------------------------------------------------------------------
  // 6. ARGUMENTO DE VENTA
  // -----------------------------------------------------------------------
  if (lead.argumento_venta) {
    currentY += 4;
    doc.setFontSize(8);
    doc.setTextColor(16, 185, 129); // Verde
    doc.setFont('helvetica', 'bold');
    doc.text('ARGUMENTO DE VENTA', 14, currentY);
    doc.setLineWidth(0.3);
    doc.setDrawColor(16, 185, 129);
    doc.line(14, currentY + 2, 196, currentY + 2);

    const lines = doc.splitTextToSize(lead.argumento_venta, 178);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(lines, 14, currentY + 8);

    currentY += 10 + lines.length * 5;
  }

  // -----------------------------------------------------------------------
  // 7. ESTADO Y ETAPA
  // -----------------------------------------------------------------------
  currentY += 6;
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  const estadoLabel: Record<string, string> = {
    raw: 'Lead Raw',
    validacion: 'En Validación',
    calificado: 'Calificado',
    cotizacion: 'En Cotización',
    cerrado: 'Cerrado',
    descartado: 'Descartado',
  };
  doc.text(`Etapa: ${estadoLabel[lead.estado] || lead.estado}`, 14, currentY);

  if (lead.iv !== undefined && lead.nc !== undefined) {
    doc.text(`Impacto Visual: ${lead.iv}/10  ·  Nivel Corporativo: ${lead.nc}/10`, 80, currentY);
  }

  // -----------------------------------------------------------------------
  // 8. PIE DE PÁGINA
  // -----------------------------------------------------------------------
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('Documento interno — Plus Gráfica SpA. Generado electrónicamente.', 105, 285, { align: 'center' });

  doc.save(`Prospecto_${lead.folio || lead.id.slice(0, 8)}_${lead.nombre_negocio.replace(/\s+/g, '_')}.pdf`);
};
