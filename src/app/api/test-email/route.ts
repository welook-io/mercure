import { NextRequest, NextResponse } from 'next/server';
import { generateInvoicePdf } from '@/lib/invoice-pdf';
import { Resend } from 'resend';

export async function GET(request: NextRequest) {
  try {
    // Datos de la última factura
    const invoiceData = {
      invoiceNumber: '0005-00002352',
      invoiceType: 'A',
      cae: '75502557726020',
      caeExpiration: '2025-12-22',
      clienteCuit: '30-71193140-2',
      clienteNombre: 'HIPERPLACA',
      neto: 2978589.36,
      iva: 625503.77,
      total: 3604092.13,
    };

    console.log('Generando PDF...');
    const pdfBuffer = await generateInvoicePdf(invoiceData);
    console.log('PDF generado, tamaño:', pdfBuffer.length);

    // Usar Resend con API key desde variable de entorno
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'RESEND_API_KEY no configurada' 
      }, { status: 500 });
    }
    const resend = new Resend(apiKey);

    const formatCurrency = (value: number) => 
      new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0;
      padding: 20px;
      background: #fafafa;
    }
    .container { 
      max-width: 560px; 
      margin: 0 auto; 
      background: white;
      border: 1px solid #e5e5e5;
    }
    .header { 
      padding: 32px 24px;
      border-bottom: 1px solid #e5e5e5;
      text-align: center;
      background-color: #ffffff !important;
    }
    .header img {
      height: 56px;
    }
    .content { 
      padding: 24px;
    }
    .greeting {
      font-size: 15px;
      color: #333;
      margin: 0 0 16px 0;
    }
    .message {
      font-size: 14px;
      color: #666;
      margin: 0 0 24px 0;
    }
    .invoice-box { 
      background: #fafafa;
      border: 1px solid #e5e5e5;
      margin: 0 0 24px 0;
    }
    .invoice-header {
      background: #171717;
      color: white;
      padding: 12px 16px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .invoice-body {
      padding: 16px;
    }
    .detail-row { 
      padding: 10px 0; 
      border-bottom: 1px solid #e5e5e5; 
      font-size: 14px;
    }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #666; display: block; font-size: 12px; margin-bottom: 2px; }
    .detail-value { font-weight: 600; color: #171717; }
    .total-box { 
      background: #171717;
      padding: 16px;
      margin-top: 16px;
    }
    .total-label { 
      color: #999;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .total-value { 
      font-size: 24px; 
      font-weight: 700; 
      color: #F97316;
      margin: 4px 0 0 0;
    }
    .signature {
      padding-top: 16px;
      border-top: 1px solid #e5e5e5;
      font-size: 13px;
      color: #666;
    }
    .footer { 
      background: #fafafa;
      padding: 20px 24px;
      border-top: 1px solid #e5e5e5;
      font-size: 11px;
      color: #999;
    }
    .footer a { color: #666; text-decoration: none; }
    .kalia-footer {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
    }
    .kalia-text {
      font-size: 10px;
      color: #999;
      margin: 0 0 8px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://mercure.kalia.app/mercure_logos/logo_remito.png" alt="Mercure" />
    </div>
    <div class="content">
      <p class="greeting">Estimado/a <strong>${invoiceData.clienteNombre}</strong>,</p>
      <p class="message">
        Adjuntamos la factura correspondiente a los servicios de transporte prestados.
      </p>
      
      <div class="invoice-box">
        <div class="invoice-header">Factura Electrónica</div>
        <div class="invoice-body">
          <div class="detail-row">
            <span class="detail-label">Número</span>
            <span class="detail-value">${invoiceData.invoiceNumber}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">CAE</span>
            <span class="detail-value">${invoiceData.cae}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Vencimiento CAE</span>
            <span class="detail-value">${invoiceData.caeExpiration}</span>
          </div>
        </div>
        <div class="total-box">
          <p class="total-label">Total</p>
          <p class="total-value">${formatCurrency(invoiceData.total)}</p>
        </div>
      </div>
      
      <div class="signature">
        <strong style="color: #171717;">Mercure S.R.L.</strong><br>
        clientes@mercuresrl.com
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0;">
        Comprobante fiscal electrónico autorizado por AFIP.<br>
        Verifique en <a href="https://www.afip.gob.ar/fe/qr/">afip.gob.ar/fe/qr</a>
      </p>
      <div class="kalia-footer">
        <p class="kalia-text">Email automático generado por el sistema de facturación y gestión integral con IA</p>
        <a href="https://kalia.app" style="color: #999; font-size: 11px; font-weight: 500;">kalia.app</a>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    console.log('Enviando email a angelo@kalia.app...');
    const { data, error } = await resend.emails.send({
      from: 'Mercure SRL <onboarding@resend.dev>',
      to: ['angelo@kalia.app'],
      subject: `Factura ${invoiceData.invoiceNumber} - Mercure S.R.L.`,
      html: htmlContent,
      attachments: [
        {
          filename: `Factura_${invoiceData.invoiceNumber.replace('-', '_')}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    const result = { success: !error, error: error?.message };

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Email enviado a angelo@kalia.app (dominio pendiente verificación para otros destinatarios)',
        invoice: invoiceData.invoiceNumber,
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error en test-email:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

