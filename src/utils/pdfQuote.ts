// ============================================================
// src/utils/pdfQuote.ts
// Generador de Cotizaciones - Versión Senior (Fix Layout & Variables)
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
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpoFormateado}-${dv}`;
};

export const generatePDF = async (quote: any, materials: any[] = []) => {
  // Importación dinámica de librerías
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();

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

  // --------------------------------------------------------------------------
  // 2. ENCABEZADO SUPERIOR
  // --------------------------------------------------------------------------

  // LOGO
  if (LOGO_BASE64) {
    try {
        doc.addImage(LOGO_BASE64, 'PNG', 14, 10, 0, 20);
    } catch (e) {
        doc.setFontSize(26);
        doc.setTextColor(6, 182, 212); // Cyan
        doc.setFont('helvetica', 'bold');
        doc.text('PlusGráfica SpA', 14, 22);
    }
  } else {
    doc.setFontSize(26);
    doc.setTextColor(6, 182, 212);
    doc.setFont('helvetica', 'bold');
    doc.text('PlusGráfica SpA', 14, 22);
  }

  // DATOS EMPRESA (Bajados un poco para separar del logo)
  const headerTextY = 40; 
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text('Plus Gráfica SpA', 14, headerTextY);
  doc.text('RUT: 76.910.073-3', 14, headerTextY + 5);
  doc.text('Temuco, Araucanía', 14, headerTextY + 10);
  doc.text('contacto@plusgrafica.cl', 14, headerTextY + 15);
  doc.text('www.plusgrafica.cl', 14, headerTextY + 20);

  // DATOS DOCUMENTO (Folio, Fechas)
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text('COTIZACIÓN N°', 140, 22);
  
  doc.setFontSize(14);
  doc.setTextColor(50);
  const identificador = quote.folio || (quote.id ? String(quote.id).slice(0, 8).toUpperCase() : 'BORRADOR');
  doc.text(`#${identificador}`, 170, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text('FECHA EMISIÓN', 140, 32);
  doc.setTextColor(50);
  doc.text(formatDate(quote.fecha_creacion), 170, 32);
  
  doc.setTextColor(150);
  doc.text('VALIDEZ', 140, 40);
  doc.setTextColor(50);
  doc.text(quote.validez_oferta || '15 Días', 170, 40);

  // --------------------------------------------------------------------------
  // 3. SECCIÓN CLIENTE (Mejorada para evitar solapamientos)
  // --------------------------------------------------------------------------
  const clientBoxY = 75; // Posición Y del recuadro
  const clientBoxHeight = 40; // Altura fija mínima

  // Recuadro de fondo
  doc.setDrawColor(200); // Gris visible para borde
  doc.setLineWidth(0.3);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, clientBoxY, 182, clientBoxHeight, 3, 3, 'FD');
  
  // Etiqueta "CLIENTE"
  doc.setFontSize(9);
  doc.setTextColor(6, 182, 212); // Cyan
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE', 23, clientBoxY + 8);
  
  // Nombre del Cliente (Con lógica de salto de línea)
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  const clienteNombre = (quote.cliente_empresa || quote.cliente_nombre || 'Cliente General').toUpperCase();

  // LIMITACIÓN DE ANCHO: 75mm para proteger la columna derecha
  const clienteSplit = doc.splitTextToSize(clienteNombre, 75); 
  doc.text(clienteSplit, 23, clientBoxY + 15);

  // Cálculo de desplazamiento vertical si el nombre ocupa varias líneas
  const linesCount = clienteSplit.length;
  // Cada línea extra añade ~4 puntos de desplazamiento
  const nameOffset = (linesCount - 1) * 4; 

  // Datos Izquierda (Debajo del nombre)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(`RUT: ${formatearRut(quote.cliente_rut)}`, 23, clientBoxY + 21 + nameOffset);
  doc.text(`Contacto: ${quote.cliente_nombre || '-'}`, 23, clientBoxY + 26 + nameOffset);

  // Datos Derecha (Columna fija, protegida por el splitTextToSize)
  doc.text(`Email: ${quote.email_cliente || '-'}`, 120, clientBoxY + 15);
  doc.text(`Fono: ${quote.telefono_cliente || '-'}`, 120, clientBoxY + 21);
  doc.text(`Condición Pago: ${quote.condicion_pago || 'Contado'}`, 120, clientBoxY + 26);


  // --------------------------------------------------------------------------
  // 4. TABLA DE ÍTEMS (Definición de Datos + Renderizado)
  // --------------------------------------------------------------------------
  
  // 1. PRIMERO DEFINIMOS LOS DATOS (Esto es lo que faltaba)
  const tableRows = items.map((item: any) => {
    // Buscamos datos del material original si existen
    const product = materials.find((m) => String(m.id) === String(item.material_id));
    
    // Código
    const codigoReal = product?.codigo || item.codigo || '-';

    // Producto (Limpiamos nombres largos)
    let nombreLimpio = item.nombre_producto || product?.nombre || 'Producto';
    if (nombreLimpio.includes('(')) {
      nombreLimpio = nombreLimpio.split('(')[0].trim();
    }

    // Características
    const detallesVariables =
      item.descripcion_item && item.descripcion_item.trim() !== ''
        ? item.descripcion_item
        : product?.caracteristicas || item.caracteristicas || '-';

    // Medidas (Lógica de ocultar si es 0x0 o 100x100)
    const esServicio = (item.medidas_ancho === 0 && item.medidas_alto === 0) || (item.medidas_ancho === 100 && item.medidas_alto === 100);
    const medidasMostrar = esServicio ? '-' : `${item.medidas_ancho}x${item.medidas_alto}cm`;

    // Retornamos la fila lista
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

  // 2. AHORA RENDERIZAMOS LA TABLA (Con los anchos corregidos)
  autoTable(doc, {
    startY: 135, // Posición segura debajo del cliente
    head: [['CÓDIGO', 'CANT.', 'PRODUCTO', 'CARACTERÍSTICAS', 'MEDIDAS', 'P. UNIDAD', 'TOTAL']],
    body: tableRows, // <--- Aquí usamos la variable que acabamos de definir arriba
    theme: 'plain',
    headStyles: {
      fillColor: [6, 182, 212], // Cyan
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: 2,
    },
    bodyStyles: {
      textColor: 50,
      fontSize: 7.5,
      cellPadding: { top: 6, bottom: 6, left: 2, right: 2 },
      valign: 'middle',
      lineColor: [230, 230, 230],
      lineWidth: 0.1,
    },
    // ANCHOS CORREGIDOS (Para que no se corten los títulos)
    columnStyles: {
      0: { halign: 'center', cellWidth: 20, fontStyle: 'bold', fontSize: 7 }, // CÓDIGO
      1: { halign: 'center', cellWidth: 13 },                                // CANT.
      2: { cellWidth: 32, fontStyle: 'bold' },                               // PRODUCTO
      3: { cellWidth: 'auto' },                                              // CARACTERÍSTICAS
      4: { halign: 'center', cellWidth: 22 },                                // MEDIDAS
      5: { halign: 'right', cellWidth: 22 },                                 // P. UNIDAD
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },              // TOTAL
    },
    didParseCell: function (data: any) {
      if (data.section === 'body' && data.row.index % 2 === 0) {
        data.cell.styles.fillColor = [248, 250, 252];
      }
    },
  });

  // --------------------------------------------------------------------------
  // 5. TOTALES Y PIE DE PÁGINA (Alineación Perfecta a la Derecha)
  // --------------------------------------------------------------------------
  
  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY + 10;
  
  if (finalY > 240) {
      doc.addPage();
      finalY = 20;
  }

  // DEFINICIÓN DE MÁRGENES DE TOTALES
  const pageRightMargin = 196; // Límite derecho alineado con la tabla (14 + 182)
  const xTotalsValue = pageRightMargin; // Los números se alinean al final
  const xTotalsLabel = pageRightMargin - 50; // Las etiquetas 50mm antes

  doc.setFontSize(10);
  doc.setTextColor(100);

  // Subtotal
  doc.text(`Subtotal:`, xTotalsLabel, finalY + 5);
  doc.text(`${FORMATTER.format(subtotalReal)}`, xTotalsValue, finalY + 5, { align: 'right' });

  let totalsOffset = 10;

  // Descuento
  if (descuentoMonto > 0) {
    doc.setTextColor(239, 68, 68);
    const pctLabel = descuentoPct ? `(${descuentoPct}%)` : '';
    doc.text(`Descuento Global ${pctLabel}:`, xTotalsLabel, finalY + totalsOffset);
    doc.text(`- ${FORMATTER.format(descuentoMonto)}`, xTotalsValue, finalY + totalsOffset, { align: 'right' });
    totalsOffset += 6;
  }

  // Neto
  doc.setTextColor(100);
  doc.text(`Neto:`, xTotalsLabel, finalY + totalsOffset);
  doc.text(`${FORMATTER.format(netoReal)}`, xTotalsValue, finalY + totalsOffset, { align: 'right' });
  totalsOffset += 6;

  // IVA
  if (aplicaIva) {
    doc.text(`IVA (19%):`, xTotalsLabel, finalY + totalsOffset);
    doc.text(`${FORMATTER.format(ivaReal)}`, xTotalsValue, finalY + totalsOffset, { align: 'right' });
  } else {
    doc.text(`IVA (Exento):`, xTotalsLabel, finalY + totalsOffset);
    doc.text(`$ 0`, xTotalsValue, finalY + totalsOffset, { align: 'right' });
  }
  totalsOffset += 8;

  // --- BLOQUE AZUL DE TOTAL FINAL ---
  // Calculamos para que el rectángulo termine EXACTAMENTE en el margen derecho (196)
  const rectWidth = 65;
  const rectX = pageRightMargin - rectWidth + 2; // +2 para dar un pequeño margen interno derecho
  
  doc.setFillColor(6, 182, 212);
  doc.rect(rectX, finalY + totalsOffset - 6, rectWidth, 10, 'F'); // Ajustamos Y -6 para centrar vertical
  
  doc.setFontSize(12);
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  
  // Texto dentro del bloque azul
  doc.text(`TOTAL:`, rectX + 5, finalY + totalsOffset + 1);
  doc.text(`${FORMATTER.format(totalReal)}`, xTotalsValue, finalY + totalsOffset + 1, { align: 'right' });

  // PIE DE PAGINA (Datos de Transferencia)
  
  // Avanzamos Y para el pie de página
  finalY += 50; 
  
  // Si no cabe, nueva página
  if (finalY > 270) {
      doc.addPage();
      finalY = 40;
  }

  // Línea divisoria
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(14, finalY - 5, 196, finalY - 5);

  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DE TRANSFERENCIA:', 14, finalY);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  const lineHeight = 5;
  doc.text('Banco: Banco Falabella', 14, finalY + lineHeight * 1);
  doc.text('Titular: Luis Sáez Candia', 14, finalY + lineHeight * 2);
  doc.text('Cuenta Corriente: 1-024-010017-8', 14, finalY + lineHeight * 3);
  doc.text('RUT: 15.756.422-6', 14, finalY + lineHeight * 4);
  doc.text('Correo: contacto@plusgrafica.cl', 14, finalY + lineHeight * 5);

  // Disclaimer legal al fondo
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    'Gracias por cotizar con PlusGráfica SpA. Documento generado electrónicamente.',
    105,
    285, // Posición fija al final de la hoja A4 (297mm)
    { align: 'center' }
  );

  const fileName = `Cotizacion_${quote.folio || quote.id || 'Borrador'}.pdf`;
  doc.save(fileName);
};