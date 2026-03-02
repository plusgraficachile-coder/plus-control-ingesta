// ============================================================
// src/utils/pdfSpecSheet.ts
// Optimización: Lógica nativa de autotable + Tipado estricto
// ============================================================
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_BASE64 } from './logo';

// Interfaz para blindar la entrada de datos
interface MaterialData {
  nombre: string;
  sku?: string;
  codigo?: string;
  descripcion_larga?: string;
  descripcion?: string;
  categoria?: string;
  ficha_tecnica?: {
    composicion?: string;
    tecnologia?: string;
    durabilidad?: string;
    resistencia?: string;
    acabado?: string;
    gramaje?: string;
    usos_recomendados_lista?: string[];
  };
}

export const generateSpecSheet = (material: MaterialData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  // En la sección de colores corporativos:
const colorDarkBlue = [30, 41, 59] as [number, number, number]; 
const colorCyan = [0, 174, 239] as [number, number, number];
const colorTextGray = [71, 85, 105] as [number, number, number];
const colorBorderGray = [226, 232, 240] as [number, number, number];
const colorLightGrayBg = [248, 250, 252] as [number, number, number];
  let cursorY = 10;

  // --- 1. ENCABEZADO ---
  if (LOGO_BASE64) {
      doc.addImage(LOGO_BASE64, 'PNG', marginX, cursorY, 0, 15);
  }

  doc.setFontSize(9);
  doc.setTextColor(colorDarkBlue[0], colorDarkBlue[1], colorDarkBlue[2]);
  doc.text('Departamento Técnico', pageWidth - marginX, cursorY + 5, { align: 'right' });
  doc.text('www.plusgrafica.cl', pageWidth - marginX, cursorY + 10, { align: 'right' });

  cursorY += 20;
  doc.setDrawColor(colorCyan[0], colorCyan[1], colorCyan[2]);
  doc.setLineWidth(1.5);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);

  // --- 2. INFORMACIÓN PRINCIPAL ---
  cursorY += 15;
  
  // Título
  doc.setFontSize(20);
  doc.setTextColor(colorDarkBlue[0], colorDarkBlue[1], colorDarkBlue[2]);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize((material.nombre || 'MATERIAL SIN NOMBRE').toUpperCase(), pageWidth - (marginX * 2));
  doc.text(titleLines, marginX, cursorY);
  cursorY += (titleLines.length * 8);

  // SKU
  doc.setFontSize(10);
  doc.setTextColor(colorCyan[0], colorCyan[1], colorCyan[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`SKU: ${material.sku || material.codigo || 'N/A'}`, marginX, cursorY);
  cursorY += 8;

  // Descripción
  doc.setFontSize(10);
  doc.setTextColor(colorTextGray[0], colorTextGray[1], colorTextGray[2]);
  doc.setFont('helvetica', 'normal');
  const descText = material.descripcion_larga || material.descripcion || "Consultar especificaciones con proveedor.";
  const descLines = doc.splitTextToSize(descText, pageWidth - (marginX * 2));
  doc.text(descLines, marginX, cursorY);
  cursorY += (descLines.length * 6) + 10;

  // Check de seguridad: Si la descripción empujó mucho el cursor, saltar página
  if (cursorY > pageHeight - 60) {
      doc.addPage();
      cursorY = 20;
  }

  // --- 3. TABLA TÉCNICA (Optimizado) ---
  const ft = material.ficha_tecnica || {};
  const fallbackText = "N/A";

  const tableBody = [
    ['Composición', ft.composicion || material.categoria || fallbackText],
    ['Tecnología', ft.tecnologia || fallbackText],
    ['Durabilidad', ft.durabilidad || fallbackText],
    ['Resistencia', ft.resistencia || fallbackText],
    ['Acabado', ft.acabado || fallbackText],
    ['Gramaje', ft.gramaje ? `${ft.gramaje}` : fallbackText],
  ];

  autoTable(doc, {
    startY: cursorY,
    head: [['ESPECIFICACIÓN', 'DETALLE TÉCNICO']],
    body: tableBody,
    theme: 'grid',
    // Estilos Globales
    styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 6, // Más aire
        lineColor: colorBorderGray,
        lineWidth: 0.1,
        textColor: colorTextGray,
    },
    // Estilos del Header
    headStyles: {
        fillColor: colorDarkBlue,
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left',
    },
    // Estilos de la primera columna (Labels)
    columnStyles: {
        0: { fontStyle: 'bold', textColor: colorDarkBlue, cellWidth: 60 }
    },
    // LOGICA CEBRA NATIVA (Reemplaza a didParseCell)
    alternateRowStyles: {
        fillColor: colorLightGrayBg 
    },
    margin: { left: marginX, right: marginX }
  });

  // @ts-ignore
  cursorY = doc.lastAutoTable.finalY + 15;

  // --- 4. USOS RECOMENDADOS ---
  // Check de salto de página antes del título
  if (cursorY + 30 > pageHeight - 30) { doc.addPage(); cursorY = 20; }

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
    `Uso estándar: ${material.categoria || 'Insumos'}`
  ];

  usos.forEach((uso) => {
    // Check intra-loop
    if (cursorY > pageHeight - 35) { doc.addPage(); cursorY = 20; }
    doc.text(`• ${uso}`, marginX + 5, cursorY);
    cursorY += 6;
  });

  // --- 5. PIE DE PÁGINA ---
  const printFooter = (pageNumber: number, totalPages: number) => {
      doc.setPage(pageNumber);
      const footerHeight = 25;
      const footerStartY = pageHeight - footerHeight;

      doc.setFillColor(241, 245, 249);
      doc.rect(0, footerStartY, pageWidth, footerHeight, 'F');
      
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text('Información referencial sujeta a cambios.', marginX, footerStartY - 5);

      doc.setFontSize(8);
      doc.setTextColor(colorTextGray[0], colorTextGray[1], colorTextGray[2]);
      doc.text('PlusGráfica SpA | Temuco, Chile', marginX, footerStartY + 15);
      
      // Paginación
      doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - marginX, footerStartY + 15, { align: 'right' });
  };

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
      printFooter(i, totalPages);
  }

  const cleanName = (material.nombre || 'material').replace(/[^a-z0-9]/gi, '_').substring(0, 20);
  doc.save(`Ficha_${cleanName}.pdf`);
};