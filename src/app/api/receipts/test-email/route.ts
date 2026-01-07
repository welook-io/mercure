import { NextRequest, NextResponse } from 'next/server';
import { generateReceiptPdf, ReceiptPaymentItem, ReceiptCancelledInvoice } from '@/lib/receipt-pdf';
import { sendReceiptEmail } from '@/lib/email';
import { Resend } from 'resend';

interface TestEmailRequest {
  email: string;
  receipt: {
    receiptNumber: string;
    receiptDate: string;
    clientName: string;
    clientCuit: string;
    clientDomicilio?: string;
    clientCbu?: string;
    currency: 'ARS' | 'USD';
    exchangeRate: number;
    paymentItems: ReceiptPaymentItem[];
    cancelledInvoices: ReceiptCancelledInvoice[];
    observations?: string;
    total: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as TestEmailRequest;

    if (!body.email || !body.receipt) {
      return NextResponse.json({ error: 'Email y recibo requeridos' }, { status: 400 });
    }

    // Generar el PDF
    const pdfBuffer = await generateReceiptPdf({
      receiptNumber: body.receipt.receiptNumber,
      receiptDate: body.receipt.receiptDate,
      clientName: body.receipt.clientName,
      clientCuit: body.receipt.clientCuit,
      clientDomicilio: body.receipt.clientDomicilio,
      clientCbu: body.receipt.clientCbu,
      currency: body.receipt.currency,
      exchangeRate: body.receipt.exchangeRate,
      paymentItems: body.receipt.paymentItems,
      cancelledInvoices: body.receipt.cancelledInvoices,
      observations: body.receipt.observations,
      total: body.receipt.total,
    });

    // Intentar con sendReceiptEmail primero, luego fallback a env var
    const result = await sendReceiptEmail({
      to: body.email,
      clientName: body.receipt.clientName,
      receiptNumber: body.receipt.receiptNumber,
      receiptDate: body.receipt.receiptDate,
      total: body.receipt.total,
      invoicesCancelled: body.receipt.cancelledInvoices.map(inv => inv.invoiceNumber),
      pdfBuffer,
    });

    // Si falla, intentar con RESEND_API_KEY del env
    if (!result.success && process.env.RESEND_API_KEY) {
      console.log('Fallback a RESEND_API_KEY del environment...');
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      const formatCurrency = (value: number) => 
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);

      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      };

      const { data, error } = await resend.emails.send({
        from: 'Mercure S.R.L. <onboarding@resend.dev>',
        to: [body.email],
        subject: `Recibo ${body.receipt.receiptNumber} - Mercure S.R.L.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #18181B; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">MERCURE S.R.L.</h1>
            </div>
            <div style="padding: 20px; background: #f9f9f9;">
              <p>Estimado/a <strong>${body.receipt.clientName}</strong>,</p>
              <p>Adjuntamos el recibo correspondiente al pago recibido.</p>
              <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h3 style="color: #16a34a; margin-top: 0;">Detalle del Recibo</h3>
                <p><strong>Número:</strong> ${body.receipt.receiptNumber}</p>
                <p><strong>Fecha:</strong> ${formatDate(body.receipt.receiptDate)}</p>
                <p style="font-size: 18px; color: #16a34a;"><strong>Total:</strong> ${formatCurrency(body.receipt.total)}</p>
              </div>
              <p>Saludos cordiales,<br><strong>Mercure S.R.L.</strong></p>
            </div>
          </div>
        `,
        attachments: [{
          filename: `Recibo_${body.receipt.receiptNumber.replace('-', '_')}.pdf`,
          content: pdfBuffer,
        }],
      });

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Email enviado a ${body.email} (via env fallback)`,
      });
    }

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Email enviado a ${body.email}`,
    });

  } catch (error) {
    console.error('Error en /api/receipts/test-email:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error al enviar email' },
      { status: 500 }
    );
  }
}

