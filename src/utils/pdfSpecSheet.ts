// ============================================================
// src/utils/pdfSpecSheet.ts
// Generador de Ficha Técnica - Diseño Profesional (Estilo Tabla Cebra)
// ============================================================
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_BASE64 } from './logo';

export const generateSpecSheet = (material: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;

  // Colores Corporativos
  const colorDarkBlue = [30, 41, 59]; // Slate-800 (Encabezados)
  const colorCyan = [6, 182, 212];    // Cyan-500 (Acentos)
  const colorTextGray = [71, 85, 105]; // Slate-600 (Texto general)
  const colorBorderGray = [226, 232, 240]; // Slate-200 (Bordes tabla)
  const colorLightGrayBg = [248, 250, 252]; // Slate-50 (Fondo filas alternas)

  // --- 1. ENCABEZADO SUPERIOR ---
  let cursorY = 10;

  // Logo
  if (LOGO_BASE64) {
      doc.addImage(LOGO_BASE64, 'PNG', marginX, cursorY, 0, 15);
  }

  // Texto "Departamento Técnico" a la derecha
  doc.setFontSize(9);
  doc.setTextColor(colorDarkBlue[0], colorDarkBlue[1], colorDarkBlue[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('Departamento Técnico', pageWidth - marginX, cursorY + 5, { align: 'right' });
  doc.text('www.plusgrafica.cl', pageWidth - marginX, cursorY + 10, { align: 'right' });

  // Línea separadora Cyan gruesa
  cursorY += 20;
  doc.setDrawColor(colorCyan[0], colorCyan[1], colorCyan[2]);
  doc.setLineWidth(1.5);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);

  // --- 2. TÍTULO Y DESCRIPCIÓN ---
  cursorY += 15;
  
  // Título Principal
  doc.setFontSize(20);
  doc.setTextColor(colorDarkBlue[0], colorDarkBlue[1], colorDarkBlue[2]);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize((material.nombre || 'Material Sin Nombre').toUpperCase(), pageWidth - (marginX * 2));
  doc.text(titleLines, marginX, cursorY);
  cursorY += (titleLines.length * 8);

  // SKU
  doc.setFontSize(10);
  doc.setTextColor(colorCyan[0], colorCyan[1], colorCyan[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`SKU: ${material.sku || material.codigo || 'N/A'}`, marginX, cursorY);
  cursorY += 8;

  // Descripción Larga
  doc.setFontSize(10);
  doc.setTextColor(colorTextGray[0], colorTextGray[1], colorTextGray[2]);
  doc.setFont('helvetica', 'normal');
  const descText = material.descripcion_larga || material.descripcion || "Material de alta calidad para aplicaciones gráficas profesionales. Consulte con su proveedor para más detalles específicos.";
  const descLines = doc.splitTextToSize(descText, pageWidth - (marginX * 2));
  doc.text(descLines, marginX, cursorY);
  cursorY += (descLines.length * 6) + 10;

  // --- 3. TABLA TÉCNICA (Estilo "Cebra" Profesional) ---
  
  // Datos seguros (Fallback) - Usamos texto genérico si no hay datos
  const ft = material.ficha_tecnica || {};
  const fallbackText = "No especificado / Consultar con proveedor";

  const tableBody = [
    ['Composición / Material', ft.composicion || material.categoria || fallbackText],
    ['Tecnología de Impresión', ft.tecnologia || fallbackText],
    ['Durabilidad Estimada', ft.durabilidad || fallbackText],
    ['Resistencia Ambiental', ft.resistencia || fallbackText],
    ['Acabado Superficial', ft.acabado || fallbackText],
    // ['Gramaje', ft.gramaje ? `${ft.gramaje} gr` : fallbackText],
  ];

  autoTable(doc, {
    startY: cursorY,
    head: [['ESPECIFICACIÓN', 'DETALLE TÉCNICO']],
    body: tableBody,
    theme: 'grid', // Mantiene los bordes
    headStyles: {
        fillColor: colorDarkBlue,
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: 5,
        lineColor: colorBorderGray,
        lineWidth: 0.1
    },
    bodyStyles: {
        textColor: colorTextGray,
        fontSize: 9,
        cellPadding: 5,
        valign: 'middle',
        lineColor: colorBorderGray,
        lineWidth: 0.1
    },
    columnStyles: {
        0: { // Primera columna
            fontStyle: 'bold',
            textColor: colorDarkBlue, // Texto azul oscuro
            cellWidth: 60
        },
        1: { // Segunda columna
            // Hereda bodyStyles
        }
    },
    // 🔥 ESTA FUNCIÓN PINTA LAS FILAS ALTERNAS 🔥
    didParseCell: function (data: any) {
        if (data.section === 'body' && data.row.index % 2 === 1) {
            // Si la fila es impar (índice 1, 3, 5...), le ponemos fondo gris claro
            data.cell.styles.fillColor = colorLightGrayBg;
        }
    },
    styles: {
        font: 'helvetica',
        overflow: 'linebreak'
    }
  });

  // Actualizamos el cursor Y
  // @ts-ignore
  cursorY = doc.lastAutoTable.finalY + 15;

  // --- 4. USOS RECOMENDADOS ---
  if (cursorY + 40 > pageHeight - 30) { doc.addPage(); cursorY = 20; }

  doc.setFontSize(11);
  doc.setTextColor(colorCyan[0], colorCyan[1], colorCyan[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('USOS RECOMENDADOS', marginX, cursorY);
  cursorY += 8;

  doc.setFontSize(10);
  doc.setTextColor(colorTextGray[0], colorTextGray[1], colorTextGray[2]);
  doc.setFont('helvetica', 'normal');

  const usos = ft.usos_recomendados_lista || [
    'Aplicaciones gráficas generales',
    'Proyectos publicitarios de interior/exterior',
    `Uso estándar para la categoría: ${material.categoria || 'Insumos'}`
  ];

  usos.forEach((uso: string) => {
    doc.text(`• ${uso}`, marginX + 5, cursorY);
    cursorY += 6;
  });

  // --- 5. PIE DE PÁGINA ---
  const footerHeight = 25;
  const footerStartY = pageHeight - footerHeight;

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text('Nota: La información técnica es referencial y está sujeta a cambios sin previo aviso. Se recomienda realizar pruebas previas.', marginX, footerStartY - 5);

  doc.setFillColor(241, 245, 249);
  doc.rect(0, footerStartY, pageWidth, footerHeight, 'F');

  doc.setFontSize(8);
  doc.setTextColor(colorTextGray[0], colorTextGray[1], colorTextGray[2]);
  doc.text('PlusGráfica SpA | Temuco, Chile | contacto@plusgrafica.cl', marginX, footerStartY + 15);
  doc.text('www.plusgrafica.cl', pageWidth - marginX, footerStartY + 15, { align: 'right' });

  // Guardar PDF
  const cleanName = (material.nombre || 'material').replace(/\s+/g, '_').substring(0, 20);
  doc.save(`FichaTecnica_${cleanName}.pdf`);
};