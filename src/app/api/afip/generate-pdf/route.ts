import { NextRequest, NextResponse } from 'next/server';

// Datos del emisor (Mercure)
const EMISOR = {
  cuit: '30-71625497-2',
  razonSocial: 'MERCURE S.R.L.',
  domicilio: 'Av. Corrientes 1234 - CABA',
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
  // dateStr puede ser "20251222" o "2025-12-22"
  if (dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  // Formato YYYYMMDD
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
  
  // Generar datos para el QR de AFIP
  const qrData = {
    ver: 1,
    fecha: today.toISOString().split('T')[0],
    cuit: parseInt(EMISOR.cuit.replace(/-/g, '')),
    ptoVta: parseInt(invoiceNumber.split('-')[0]),
    tipoCmp: invoiceType === 'A' ? 1 : 6,
    nroCmp: parseInt(invoiceNumber.split('-')[1]),
    importe: total,
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: 80,
    nroDocRec: parseInt(clienteCuit.replace(/-/g, '')),
    tipoCodAut: 'E',
    codAut: parseInt(cae),
  };
  
  const qrBase64 = Buffer.from(JSON.stringify(qrData)).toString('base64');
  const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${qrBase64}`;
  
  // Crear HTML del PDF
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Helvetica Neue', Arial, sans-serif; 
      font-size: 11px; 
      color: #333;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header { 
      display: flex; 
      border: 2px solid #333;
      margin-bottom: 15px;
    }
    .header-left, .header-right { 
      flex: 1; 
      padding: 15px;
    }
    .header-center {
      width: 80px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-left: 2px solid #333;
      border-right: 2px solid #333;
      background: #f5f5f5;
    }
    .tipo-factura {
      font-size: 48px;
      font-weight: bold;
      line-height: 1;
    }
    .codigo-tipo {
      font-size: 10px;
      margin-top: 5px;
    }
    .empresa-nombre {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .empresa-datos {
      font-size: 10px;
      line-height: 1.4;
    }
    .factura-titulo {
      font-size: 14px;
      font-weight: bold;
      text-align: right;
      margin-bottom: 5px;
    }
    .factura-numero {
      font-size: 16px;
      font-weight: bold;
      text-align: right;
      margin-bottom: 10px;
    }
    .factura-fecha {
      text-align: right;
      font-size: 11px;
    }
    .cliente-box {
      border: 1px solid #ccc;
      padding: 12px;
      margin-bottom: 15px;
      background: #fafafa;
    }
    .cliente-titulo {
      font-weight: bold;
      margin-bottom: 8px;
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
    }
    .cliente-row {
      display: flex;
      margin-bottom: 4px;
    }
    .cliente-label {
      width: 120px;
      font-weight: 500;
      color: #666;
    }
    .detalle-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    .detalle-table th {
      background: #333;
      color: white;
      padding: 10px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
    }
    .detalle-table td {
      padding: 10px;
      border-bottom: 1px solid #ddd;
    }
    .text-right {
      text-align: right;
    }
    .totales-box {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 20px;
    }
    .totales-content {
      width: 280px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #eee;
    }
    .total-row.grande {
      font-size: 16px;
      font-weight: bold;
      border-top: 2px solid #333;
      border-bottom: none;
      padding-top: 10px;
      margin-top: 5px;
    }
    .cae-box {
      border: 2px solid #333;
      padding: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f9f9f9;
    }
    .cae-info {
      flex: 1;
    }
    .cae-titulo {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 8px;
      text-transform: uppercase;
      color: #333;
    }
    .cae-numero {
      font-size: 18px;
      font-family: monospace;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .cae-vto {
      font-size: 11px;
      color: #666;
    }
    .qr-box {
      width: 120px;
      height: 120px;
      border: 1px solid #ccc;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
    }
    .qr-placeholder {
      font-size: 10px;
      text-align: center;
      color: #999;
      padding: 10px;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 9px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="empresa-nombre">${EMISOR.razonSocial}</div>
      <div class="empresa-datos">
        <div>${EMISOR.domicilio}</div>
        <div>CUIT: ${EMISOR.cuit}</div>
        <div>${EMISOR.condicionIva}</div>
        <div>Inicio de Actividades: ${EMISOR.inicioActividades}</div>
      </div>
    </div>
    <div class="header-center">
      <div class="tipo-factura">${invoiceType}</div>
      <div class="codigo-tipo">COD. ${invoiceType === 'A' ? '01' : '06'}</div>
    </div>
    <div class="header-right">
      <div class="factura-titulo">FACTURA</div>
      <div class="factura-numero">Nº ${invoiceNumber}</div>
      <div class="factura-fecha">
        <div>Fecha de Emisión: ${fechaEmision}</div>
        <div>CUIT: ${EMISOR.cuit}</div>
      </div>
    </div>
  </div>
  
  <div class="cliente-box">
    <div class="cliente-titulo">Datos del Cliente</div>
    <div class="cliente-row">
      <span class="cliente-label">Razón Social:</span>
      <span>${clienteNombre}</span>
    </div>
    <div class="cliente-row">
      <span class="cliente-label">CUIT:</span>
      <span>${clienteCuit}</span>
    </div>
    <div class="cliente-row">
      <span class="cliente-label">Condición IVA:</span>
      <span>IVA Responsable Inscripto</span>
    </div>
  </div>
  
  <table class="detalle-table">
    <thead>
      <tr>
        <th style="width: 60%">Descripción</th>
        <th class="text-right">Cantidad</th>
        <th class="text-right">Precio Unit.</th>
        <th class="text-right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Servicios de flete</td>
        <td class="text-right">1</td>
        <td class="text-right">${formatCurrency(neto)}</td>
        <td class="text-right">${formatCurrency(neto)}</td>
      </tr>
    </tbody>
  </table>
  
  <div class="totales-box">
    <div class="totales-content">
      <div class="total-row">
        <span>Subtotal Neto:</span>
        <span>${formatCurrency(neto)}</span>
      </div>
      <div class="total-row">
        <span>IVA 21%:</span>
        <span>${formatCurrency(iva)}</span>
      </div>
      <div class="total-row grande">
        <span>TOTAL:</span>
        <span>${formatCurrency(total)}</span>
      </div>
    </div>
  </div>
  
  <div class="cae-box">
    <div class="cae-info">
      <div class="cae-titulo">CAE (Código de Autorización Electrónico)</div>
      <div class="cae-numero">${cae}</div>
      <div class="cae-vto">Fecha de Vencimiento: ${formatDate(caeExpiration)}</div>
    </div>
    <div class="qr-box">
      <div class="qr-placeholder">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrUrl)}" width="100" height="100" alt="QR AFIP" />
      </div>
    </div>
  </div>
  
  <div class="footer">
    Comprobante autorizado por AFIP - Verifique este comprobante en: www.afip.gob.ar/fe/qr/
  </div>
</body>
</html>
`;

  // Generar PDF con Puppeteer
  try {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm',
      },
    });
    
    await browser.close();
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Factura_${invoiceNumber.replace('-', '_')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generando PDF:', error);
    // Fallback a HTML si falla Puppeteer
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="Factura_${invoiceNumber.replace('-', '_')}.html"`,
      },
    });
  }
}

