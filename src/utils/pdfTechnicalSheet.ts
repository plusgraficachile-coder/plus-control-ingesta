// ============================================================
// src/utils/pdfTechnicalSheet.ts
// Genera la Orden de Trabajo para Taller (SIN PRECIOS) + LOGO
// ============================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_BASE64 } from './logo'; // <-- Importamos el logo

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export const generateTechnicalPDF = (quote: any) => {
  const doc = new jsPDF();

  // 1. ENCABEZADO (Logo y Título)
  doc.setFillColor(30, 41, 59); // Color de fondo oscuro (Slate-800)
  doc.rect(0, 0, 210, 45, 'F'); // Altura del fondo

  // --- LOGO ---
  if (LOGO_BASE64) {
      // (Imagen, Formato, X, Y, Ancho Auto, Alto Fijo)
      doc.addImage(LOGO_BASE64, 'PNG', 14, 8, 0, 18); 
  }

  // --- TÍTULO Y SUBTÍTULO ---
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  // Ajustamos posición para no chocar con el logo
  doc.text('ORDEN DE TRABAJO', 14, 34); 

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('FICHA TÉCNICA DE PRODUCCIÓN', 14, 39);

  // --- DATOS DEL FOLIO (Derecha) ---
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 211, 238); // Cyan-400
  doc.text(`#${quote.folio || (quote.id ? String(quote.id).slice(0, 8).toUpperCase() : '---')}`, 195, 18, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${formatDate(quote.fecha_creacion)}`, 195, 25, { align: 'right' });

  // --- ESTADO ---
  doc.setFillColor(quote.estado === 'En Producción' ? '#f59e0b' : '#22d3ee'); 
  doc.roundedRect(165, 30, 30, 6, 1, 1, 'F');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text((quote.estado || 'BORRADOR').toUpperCase(), 180, 34, { align: 'center' });

  // 2. INFORMACIÓN DEL CLIENTE / PROYECTO
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE / PROYECTO:', 14, 60);

  doc.setFontSize(11);
  doc.setTextColor(0);
  const cliente = quote.cliente_empresa || quote.cliente_nombre || 'Desconocido';
  doc.text(cliente.toUpperCase(), 14, 66);

  if (quote.descripcion_proyecto) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80);
      const splitDesc = doc.splitTextToSize(quote.descripcion_proyecto, 180);
      doc.text(splitDesc, 14, 72);
  }

  // 3. TABLA DE ÍTEMS
  const tableRows = (quote.items || []).map((item: any) => {
      let nombre = item.nombre_producto || 'Producto';
      if (nombre.includes('(')) nombre = nombre.split('(')[0].trim();

      const detalles = item.descripcion_item || item.caracteristicas || '-';
      
      const esServicio = item.medidas_ancho === 100 && item.medidas_alto === 100;
      const medidas = esServicio ? 'Servicio / Global' : `${item.medidas_ancho} x ${item.medidas_alto} cm`;

      const check = '[  ]';

      return [item.cantidad, `${nombre}\n${detalles}`, medidas, check];
  });

  autoTable(doc, {
      startY: 85,
      head: [['CANT', 'PRODUCTO / DESCRIPCIÓN TÉCNICA', 'MEDIDAS (cm)', 'CHECK']],
      body: tableRows,
      theme: 'plain',
      headStyles: {
          fillColor: [30, 41, 59], 
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
      },
      bodyStyles: {
          textColor: 50,
          fontSize: 9,
          cellPadding: 4,
          valign: 'middle',
          lineColor: [200, 200, 200],
          lineWidth: 0.1
      },
      columnStyles: {
          0: { halign: 'center', fontStyle: 'bold', cellWidth: 15 },
          1: { cellWidth: 'auto' },
          2: { halign: 'center', fontStyle: 'bold', cellWidth: 35 },
          3: { halign: 'center', fontStyle: 'bold', cellWidth: 20, textColor: 150 }
      },
      styles: { overflow: 'linebreak' },
  });

  // 4. PIE DE PÁGINA (Firmas)
  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY + 40;

  if (finalY > 250) {
      doc.addPage();
      finalY = 60;
  }

  doc.setDrawColor(150);
  doc.setLineWidth(0.5);
  
  // Firma 1
  doc.line(40, finalY, 90, finalY);
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'bold');
  doc.text('RESPONSABLE TALLER', 65, finalY + 5, { align: 'center' });

  // Firma 2
  doc.line(120, finalY, 170, finalY);
  doc.text('CONTROL CALIDAD', 145, finalY + 5, { align: 'center' });

  // Guardar
  const fileName = `OT_${quote.folio || quote.id || 'Taller'}.pdf`;
  window.open(doc.output('bloburl'), '_blank');
};