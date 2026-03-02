// ============================================================
// src/utils/pdfQuote.ts
// Generador de Cotizaciones — Versión Premium v3
// ============================================================

import { LOGO_BASE64 } from './logo';

// --- FORMATEADORES ---
const FORMATTER = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

// --- HELPER: Formatear RUT ---
const formatearRut = (rutRaw: string) => {
  if (!rutRaw) return '-';
  const valor = rutRaw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (valor.length <= 1) return valor;
  const cuerpo = valor.slice(0, -1);
  const dv = valor.slice(-1);
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpoFormateado}-${dv}`;
};

// --- PALETA DE COLORES ---
const CYAN    = [6, 182, 212]    as [number, number, number];
const DARK    = [10, 36, 78]     as [number, number, number]; // azul profundo unificado
const GRAY    = [100, 116, 139]  as [number, number, number];
const GRAY2   = [148, 163, 184]  as [number, number, number];
const LIGHT   = [248, 250, 252]  as [number, number, number];
const WHITE   = [255, 255, 255]  as [number, number, number];
const BORDER  = [226, 232, 240]  as [number, number, number];
const CYAN_BG = [240, 253, 255]  as [number, number, number];
const CYAN_BD = [186, 230, 253]  as [number, number, number];

export const generatePDF = async (quote: any, materials: any[] = []) => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const PW = 210;
  const ML = 14;
  const MR = 14;
  const CW = PW - ML - MR; // 182mm

  // --------------------------------------------------------------------------
  // 1. CÁLCULO MATEMÁTICO
  // --------------------------------------------------------------------------
  const items = quote.items || [];
  const subtotalReal = items.reduce((acc: number, item: any) => acc + (Number(item.total_linea) || 0), 0);
  const descuentoPct = Number(quote.descuento_porcentaje) || 0;
  const descuentoMonto = Math.round(subtotalReal * (descuentoPct / 100));
  const netoReal = subtotalReal - descuentoMonto;
  const aplicaIva = quote.aplica_iva !== undefined ? quote.aplica_iva : true;
  const ivaReal = aplicaIva ? Math.round(netoReal * 0.19) : 0;
  const totalReal = netoReal + ivaReal;
  const identificador = quote.folio || (quote.id ? String(quote.id).slice(0, 8).toUpperCase() : 'BORRADOR');

  // --------------------------------------------------------------------------
  // 2. HEADER — compacto, jerarquía tipográfica clara
  // --------------------------------------------------------------------------
  const HEADER_H = 20; // más alto para que el badge quepa con aire

  doc.setFillColor(...DARK);
  doc.rect(0, 0, PW, HEADER_H, 'F');

  doc.setFillColor(...CYAN);
  doc.rect(0, HEADER_H, PW, 1.2, 'F');

  // Izquierda: label pequeño + folio grande
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY2);
  doc.text('COTIZACION N\xb0', ML, 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.text(` ${identificador}`, ML, 16);

  // Derecha: fecha
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY2);
  doc.text('FECHA EMISIÓN', PW - MR, 7, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text(formatDate(quote.fecha_creacion), PW - MR, 12, { align: 'right' });

  // Badge de validez — bien dentro del header con margen inferior
  const validezText = quote.validez_oferta || '15 Días';
  doc.setFontSize(7);
  const badgeTxt = `Validez: ${validezText}`;
  const badgeW = doc.getTextWidth(badgeTxt) + 5;
  const badgeX = PW - MR - badgeW;
  doc.setFillColor(...CYAN);
  doc.roundedRect(badgeX, 14.5, badgeW, 4, 0.8, 0.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...DARK);
  doc.text(badgeTxt, badgeX + 2.5, 17.5);

  // --------------------------------------------------------------------------
  // 3. LOGO + DATOS EMPRESA
  // --------------------------------------------------------------------------
  const LOGO_Y = HEADER_H + 7;

  if (LOGO_BASE64) {
    try {
      doc.addImage(LOGO_BASE64, 'JPEG', ML, LOGO_Y, 52, 16, undefined, 'FAST');
    } catch {
      doc.setFontSize(16);
      doc.setTextColor(...CYAN);
      doc.setFont('helvetica', 'bold');
      doc.text('PlusGrafica SpA', ML, LOGO_Y + 10);
    }
  } else {
    doc.setFontSize(16);
    doc.setTextColor(...CYAN);
    doc.setFont('helvetica', 'bold');
    doc.text('PlusGrafica SpA', ML, LOGO_Y + 10);
  }

  const EX = PW - MR;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  doc.text('Plus Gráfica SpA', EX, LOGO_Y + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text('RUT: 76.910.073-3',       EX, LOGO_Y + 9,  { align: 'right' });
  doc.text('Temuco, Araucanía',       EX, LOGO_Y + 13, { align: 'right' });
  doc.text('contacto@plusgrafica.cl', EX, LOGO_Y + 17, { align: 'right' });
  doc.text('www.plusgrafica.cl',      EX, LOGO_Y + 21, { align: 'right' });

  const divY = LOGO_Y + 26;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(ML, divY, PW - MR, divY);

  // --------------------------------------------------------------------------
  // 4. SECCIÓN CLIENTE — 2 columnas, padding reducido, contraste alto
  // --------------------------------------------------------------------------
  const clientBoxY = divY + 5;

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  const clienteNombre = (quote.cliente_empresa || quote.cliente_nombre || 'Cliente General').toUpperCase();
  const clienteSplit = doc.splitTextToSize(clienteNombre, 78);
  const linesCount = clienteSplit.length;
  const nameOffset = (linesCount - 1) * 4;
  const clientBoxHeight = Math.max(36, 22 + nameOffset + 10);

  doc.setFillColor(...WHITE);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, clientBoxY, CW, clientBoxHeight, 2, 2, 'FD');

  doc.setFillColor(...CYAN);
  doc.rect(ML, clientBoxY, 3, clientBoxHeight, 'F');

  // Label CLIENTE con más contraste
  doc.setFontSize(7);
  doc.setTextColor(...CYAN);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE', ML + 6, clientBoxY + 7);

  // Nombre
  doc.setFontSize(10.5);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.text(clienteSplit, ML + 6, clientBoxY + 14);

  // Columna izquierda — datos fiscales
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(`RUT: ${formatearRut(quote.cliente_rut)}`,  ML + 6, clientBoxY + 20 + nameOffset);
  doc.text(`Contacto: ${quote.cliente_nombre || '-'}`, ML + 6, clientBoxY + 26 + nameOffset);

  // Divisor vertical entre columnas
  const colDivX = ML + CW / 2 - 2;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(colDivX, clientBoxY + 6, colDivX, clientBoxY + clientBoxHeight - 6);

  // Columna derecha — contacto y pago
  const col2X = colDivX + 6;
  doc.setFontSize(6.5);
  doc.setTextColor(...CYAN);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTACTO Y PAGO', col2X, clientBoxY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(`Email: ${quote.email_cliente || '-'}`,                 col2X, clientBoxY + 14);
  doc.text(`Fono: ${quote.telefono_cliente || '-'}`,               col2X, clientBoxY + 20);
  doc.text(`Condición Pago: ${quote.condicion_pago || 'Contado'}`, col2X, clientBoxY + 26);

  // --------------------------------------------------------------------------
  // 5. TABLA — sin líneas verticales, solo horizontales, +10% aire entre filas
  // --------------------------------------------------------------------------
  const tableRows = items.map((item: any) => {
    const product = materials.find((m) => String(m.id) === String(item.material_id));
    const codigoReal = product?.codigo || item.codigo || '-';

    let nombreLimpio = item.nombre_producto || product?.nombre || 'Producto';
    if (nombreLimpio.includes('(')) nombreLimpio = nombreLimpio.split('(')[0].trim();

    const detallesVariables =
      item.descripcion_item && item.descripcion_item.trim() !== ''
        ? item.descripcion_item
        : product?.caracteristicas || item.caracteristicas || '-';

    const esServicio =
      (item.medidas_ancho === 0 && item.medidas_alto === 0) ||
      (item.medidas_ancho === 100 && item.medidas_alto === 100);
    const medidasMostrar = esServicio ? '-' : `${item.medidas_ancho}x${item.medidas_alto}cm`;

    return [
      codigoReal,
      item.cantidad,
      nombreLimpio,
      detallesVariables,
      medidasMostrar,
      FORMATTER.format(Number(item.precio_unitario_aplicado) || 0),
      FORMATTER.format(Number(item.total_linea) || 0),
    ];
  });

  autoTable(doc, {
    startY: clientBoxY + clientBoxHeight + 8,
    margin: { left: ML, right: MR },
    head: [['CODIGO', 'CANT', 'PRODUCTO', 'CARACTERISTICAS', 'MEDIDAS', 'P. UNIDAD', 'TOTAL']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: DARK,
      textColor: WHITE,
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
      lineWidth: 0, // sin bordes en header
    },
    bodyStyles: {
      textColor: [30, 41, 59],
      fontSize: 7.5,
      cellPadding: { top: 7.5, bottom: 7.5, left: 3, right: 3 }, // más aire entre filas
      valign: 'middle',
      lineWidth: 0, // sin bordes — se dibujan manualmente solo horizontales
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20, fontStyle: 'bold', fontSize: 7, textColor: [160, 174, 192] }, // codigo gris medio
      1: { halign: 'center', cellWidth: 13 },
      2: { cellWidth: 32, fontStyle: 'bold', fontSize: 9, textColor: DARK },   // producto mas bold
      3: { cellWidth: 'auto', textColor: GRAY, fontSize: 7.5, minCellHeight: 0 },
      4: { halign: 'center', cellWidth: 22 },
      5: { halign: 'right', cellWidth: 24 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 24, textColor: DARK },
    },
    didParseCell: function (data: any) {
      if (data.section === 'body' && data.row.index % 2 !== 0) {
        data.cell.styles.fillColor = LIGHT;
      }
    },
    // Solo líneas horizontales entre filas
    didDrawCell: function (data: any) {
      if (data.section === 'body') {
        const { x, y, width, height } = data.cell;
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.15);
        doc.line(x, y + height, x + width, y + height);
      }
    },
  });

  // --------------------------------------------------------------------------
  // 6. TOTALES — alineados con tabla, línea divisoria cyan + TOTAL escalado
  // --------------------------------------------------------------------------
  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY + 12; // más aire

  if (finalY > 240) {
    doc.addPage();
    finalY = 20;
  }

  const pageRightMargin = ML + CW; // 196 — alineado exacto con tabla
  const xVal    = pageRightMargin - 3; // 3mm de margen interno derecho
  const xLabel  = pageRightMargin - 60;
  const totalsBoxW = 64;
  const totalsBoxX = pageRightMargin - totalsBoxW;
  const extraDesc  = descuentoMonto > 0 ? 7 : 0;
  const totalsBoxH = 32 + extraDesc;

  // Recuadro contenedor de subtotales
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(totalsBoxX - 2, finalY - 2, totalsBoxW + 2, totalsBoxH, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');

  // Subtotal
  doc.setTextColor(180, 194, 210); // gris mas claro
  doc.text('Subtotal:', xLabel, finalY + 6);
  doc.setTextColor(...DARK);
  doc.text(FORMATTER.format(subtotalReal), xVal, finalY + 6, { align: 'right' });

  let tOff = 13;

  // Descuento
  if (descuentoMonto > 0) {
    doc.setTextColor(239, 68, 68);
    const pctLabel = descuentoPct ? ` (${descuentoPct}%)` : '';
    doc.text(`Descuento${pctLabel}:`, xLabel, finalY + tOff);
    doc.text(`- ${FORMATTER.format(descuentoMonto)}`, xVal, finalY + tOff, { align: 'right' });
    tOff += 7;
  }

  // Neto
  doc.setTextColor(180, 194, 210);
  doc.text('Neto:', xLabel, finalY + tOff);
  doc.setTextColor(...DARK);
  doc.text(FORMATTER.format(netoReal), xVal, finalY + tOff, { align: 'right' });
  tOff += 7;

  // IVA
  doc.setTextColor(180, 194, 210);
  if (aplicaIva) {
    doc.text('IVA (19%):', xLabel, finalY + tOff);
    doc.setTextColor(...DARK);
    doc.text(FORMATTER.format(ivaReal), xVal, finalY + tOff, { align: 'right' });
  } else {
    doc.text('IVA (Exento):', xLabel, finalY + tOff);
    doc.setTextColor(...DARK);
    doc.text('$ 0', xVal, finalY + tOff, { align: 'right' });
  }
  tOff += 10;

  
  // ── BLOQUE TOTAL: fondo oscuro, número cyan +12% ──
  const totalRectH = 13;
  doc.setFillColor(...DARK);
  doc.roundedRect(totalsBoxX - 2, finalY + tOff - 4, totalsBoxW + 2, totalRectH, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text('TOTAL:', totalsBoxX + 3, finalY + tOff + 5);

  doc.setFontSize(13.8);
  doc.setTextColor(...CYAN);
  doc.text(FORMATTER.format(totalReal), xVal, finalY + tOff + 5, { align: 'right' });

  // --------------------------------------------------------------------------
  // 7. DATOS DE TRANSFERENCIA — bloque modular, label+valor en 2 columnas
  // --------------------------------------------------------------------------
  const tfBoxH = 48; // ajustado para contenido equilibrado
  const limiteSeguridad = 258;

  if (finalY + tOff + tfBoxH > limiteSeguridad) {
    doc.addPage();
    finalY = 25;
    tOff = 0;
  } else {
    finalY = finalY + tOff + 20; // aire generoso post-TOTAL
  }

  // Línea divisoria
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(ML, finalY - 5, PW - MR, finalY - 5);

  // Recuadro modular — fondo blanco, borde sutil
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...CYAN_BD);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, finalY, 110, tfBoxH, 2, 2, 'FD');

  // Acento izquierdo
  doc.setFillColor(...CYAN);
  doc.rect(ML, finalY, 3, tfBoxH, 'F');

  // Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text('DATOS DE TRANSFERENCIA', ML + 6, finalY + 8);

  doc.setDrawColor(...CYAN_BD);
  doc.setLineWidth(0.3);
  doc.line(ML + 6, finalY + 10, ML + 104, finalY + 10);

  // Helper para filas label: valor
  const drawRow = (label: string, value: string, x: number, y: number) => {
    doc.setTextColor(...GRAY2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(label, x, y);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(value, x + doc.getTextWidth(label) + 1, y);
  };

  const lhb = 5.5;
  const c1 = ML + 6;
  const c2 = ML + 58;

  drawRow('Nombre:  ', 'Plus Gráfica Spa',          c1, finalY + lhb * 2 + 4);
  drawRow('RUT:  ',    '76.910.073-3',               c1, finalY + lhb * 3 + 4);
  drawRow('Banco:  ',  'BCI',                        c1, finalY + lhb * 4 + 4);

  drawRow('Tipo:  ',   'Cta. Corriente',             c2, finalY + lhb * 2 + 4);
  drawRow('Numero de Cta:  ', '71872376',            c2, finalY + lhb * 3 + 4);
  drawRow('Email:  ',  'contacto@plusgrafica.cl',    c2, finalY + lhb * 4 + 4);

  // Línea separadora antes del importante
  const impY = finalY + lhb * 5 + 8;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(ML, divY, PW - MR, divY);

  // Nota IMPORTANTE — dentro del recuadro
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY2);
  doc.text('IMPORTANTE: Envíanos el comprobante para ingresar tu pedido a producción.', ML + 6, impY + 3);

  // --------------------------------------------------------------------------
  // 8. FOOTER
  // --------------------------------------------------------------------------
  doc.setFontSize(7.5);
  doc.setTextColor(180, 180, 180);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Gracias por cotizar con PlusGrafica SpA  \xb7  Documento generado electrónicamente.',
    105,
    286,
    { align: 'center' }
  );

  doc.setFillColor(...CYAN);
  doc.rect(0, 292, PW, 3, 'F'); // barra mas delgada, menos peso

  const fileName = `Cotizacion_${quote.folio || quote.id || 'Borrador'}.pdf`;
  doc.save(fileName);
};