import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';

// Datos del emisor (Mercure)
const EMISOR = {
  cuit: '30-71625497-2',
  razonSocial: 'MERCURE S.R.L.',
  domicilio: 'La Higuera 10, Los Perales - San Salvador de Jujuy, Jujuy - CP 4600',
  condicionIva: 'IVA Responsable Inscripto',
  inicioActividades: '01/01/2020',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string): string {
  if (dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  return `${day}/${month}/${year}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const invoiceNumber = searchParams.get('invoiceNumber') || '';
  const cae = searchParams.get('cae') || '';
  const caeExpiration = searchParams.get('caeExpiration') || '';
  const clienteCuit = searchParams.get('clienteCuit') || '';
  const clienteNombre = searchParams.get('clienteNombre') || '';
  const neto = parseFloat(searchParams.get('neto') || '0');
  const iva = parseFloat(searchParams.get('iva') || '0');
  const total = parseFloat(searchParams.get('total') || '0');
  const invoiceType = searchParams.get('invoiceType') || 'A';
  
  const today = new Date();
  const fechaEmision = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

  try {
    // Crear PDF con jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // ===== HEADER =====
    // Cuadro izquierdo - Datos empresa
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, 70, 40);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(EMISOR.razonSocial, margin + 5, y + 10);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(EMISOR.domicilio, margin + 5, y + 17, { maxWidth: 60 });
    doc.text(`CUIT: ${EMISOR.cuit}`, margin + 5, y + 27);
    doc.text(EMISOR.condicionIva, margin + 5, y + 32);
    doc.text(`Inicio Act.: ${EMISOR.inicioActividades}`, margin + 5, y + 37);

    // Cuadro centro - Tipo factura
    doc.rect(margin + 70, y, 30, 40);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin + 70, y, 30, 40, 'F');
    doc.rect(margin + 70, y, 30, 40);
    
    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.text(invoiceType, margin + 85, y + 25, { align: 'center' });
    
    doc.setFontSize(8);
    doc.text(`COD. ${invoiceType === 'A' ? '01' : '06'}`, margin + 85, y + 35, { align: 'center' });

    // Cuadro derecho - Número factura
    doc.rect(margin + 100, y, 70, 40);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURA', margin + 135, y + 10, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(`Nº ${invoiceNumber}`, margin + 135, y + 20, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${fechaEmision}`, margin + 135, y + 30, { align: 'center' });
    doc.text(`CUIT: ${EMISOR.cuit}`, margin + 135, y + 36, { align: 'center' });

    y += 50;

    // ===== DATOS CLIENTE =====
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, y, pageWidth - 2 * margin, 25, 'F');
    doc.rect(margin, y, pageWidth - 2 * margin, 25);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL CLIENTE', margin + 5, y + 7);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Razón Social: ${clienteNombre}`, margin + 5, y + 14);
    doc.text(`CUIT: ${clienteCuit}`, margin + 5, y + 20);
    doc.text('Condición IVA: IVA Responsable Inscripto', margin + 100, y + 14);

    y += 35;

    // ===== TABLA DETALLE =====
    // Header tabla
    doc.setFillColor(51, 51, 51);
    doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Descripción', margin + 5, y + 5.5);
    doc.text('Cant.', margin + 100, y + 5.5);
    doc.text('Precio Unit.', margin + 120, y + 5.5);
    doc.text('Subtotal', margin + 150, y + 5.5);

    y += 8;
    doc.setTextColor(0, 0, 0);

    // Fila de datos
    doc.setFont('helvetica', 'normal');
    doc.rect(margin, y, pageWidth - 2 * margin, 10);
    doc.text('Servicios de flete', margin + 5, y + 6.5);
    doc.text('1', margin + 100, y + 6.5);
    doc.text(formatCurrency(neto), margin + 120, y + 6.5);
    doc.text(formatCurrency(neto), margin + 150, y + 6.5);

    y += 20;

    // ===== TOTALES =====
    const totalsX = pageWidth - margin - 70;
    
    doc.setFontSize(10);
    doc.text('Subtotal Neto:', totalsX, y);
    doc.text(formatCurrency(neto), pageWidth - margin, y, { align: 'right' });
    
    y += 6;
    doc.text('IVA 21%:', totalsX, y);
    doc.text(formatCurrency(iva), pageWidth - margin, y, { align: 'right' });
    
    y += 2;
    doc.setLineWidth(0.5);
    doc.line(totalsX, y, pageWidth - margin, y);
    
    y += 8;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', totalsX, y);
    doc.text(formatCurrency(total), pageWidth - margin, y, { align: 'right' });

    y += 20;

    // ===== CAE =====
    doc.setLineWidth(0.5);
    doc.rect(margin, y, pageWidth - 2 * margin, 30);
    doc.setFillColor(249, 249, 249);
    doc.rect(margin, y, pageWidth - 2 * margin, 30, 'F');
    doc.rect(margin, y, pageWidth - 2 * margin, 30);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CAE (Código de Autorización Electrónico)', margin + 5, y + 8);
    
    doc.setFontSize(14);
    doc.setFont('courier', 'bold');
    doc.text(cae, margin + 5, y + 18);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de Vencimiento: ${formatDate(caeExpiration)}`, margin + 5, y + 25);

    // QR placeholder (cuadrado a la derecha)
    const qrSize = 25;
    const qrX = pageWidth - margin - qrSize - 5;
    const qrY = y + 2.5;
    doc.rect(qrX, qrY, qrSize, qrSize);
    doc.setFontSize(7);
    doc.text('QR AFIP', qrX + qrSize/2, qrY + qrSize/2 + 2, { align: 'center' });

    y += 40;

    // ===== FOOTER =====
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Comprobante autorizado - Verifique este comprobante en: www.afip.gob.ar/fe/qr/', pageWidth / 2, y, { align: 'center' });

    // Generar buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Factura_${invoiceNumber.replace('-', '_')}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generando PDF:', error);
    return new NextResponse(JSON.stringify({ error: 'Error generando PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
