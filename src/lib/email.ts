import { Resend } from 'resend';
import { supabaseAdmin } from './supabase';

interface EmailConfig {
  api_key: string;
  from_email: string;
  from_name: string;
  bcc_emails: string[];
  is_active: boolean;
}

let cachedConfig: EmailConfig | null = null;
let resendClient: Resend | null = null;

async function getEmailConfig(): Promise<EmailConfig | null> {
  if (cachedConfig) return cachedConfig;

  const { data, error } = await supabaseAdmin!
    .schema('mercure')
    .from('email_config')
    .select('*')
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.error('Error fetching email config:', error);
    return null;
  }

  cachedConfig = data as EmailConfig;
  return cachedConfig;
}

async function getResendClient(): Promise<Resend | null> {
  if (resendClient) return resendClient;

  const config = await getEmailConfig();
  if (!config) return null;

  resendClient = new Resend(config.api_key);
  return resendClient;
}

interface SendInvoiceEmailParams {
  to: string;
  clientName: string;
  invoiceNumber: string;
  cae: string;
  caeExpiration: string;
  total: number;
  pdfBuffer: Buffer;
}

export async function sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getEmailConfig();
    if (!config) {
      return { success: false, error: 'Configuración de email no encontrada' };
    }

    const resend = await getResendClient();
    if (!resend) {
      return { success: false, error: 'No se pudo inicializar el cliente de email' };
    }

    const formatCurrency = (value: number) => 
      new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #18181B; color: white; padding: 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 20px; background: #f9f9f9; }
    .invoice-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .invoice-details h3 { margin-top: 0; color: #F97316; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .detail-row:last-child { border-bottom: none; }
    .total { font-size: 18px; font-weight: bold; color: #F97316; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MERCURE S.R.L.</h1>
    </div>
    <div class="content">
      <p>Estimado/a <strong>${params.clientName}</strong>,</p>
      <p>Adjuntamos la factura correspondiente a los servicios de flete.</p>
      
      <div class="invoice-details">
        <h3>Detalle de Factura</h3>
        <div class="detail-row">
          <span>Número de Factura:</span>
          <strong>${params.invoiceNumber}</strong>
        </div>
        <div class="detail-row">
          <span>CAE:</span>
          <span>${params.cae}</span>
        </div>
        <div class="detail-row">
          <span>Vencimiento CAE:</span>
          <span>${params.caeExpiration}</span>
        </div>
        <div class="detail-row total">
          <span>Total:</span>
          <span>${formatCurrency(params.total)}</span>
        </div>
      </div>
      
      <p>Adjuntamos el comprobante en formato PDF para su archivo.</p>
      <p>Ante cualquier consulta, no dude en contactarnos.</p>
      <p>Saludos cordiales,<br><strong>Mercure S.R.L.</strong></p>
    </div>
    <div class="footer">
      <p>Este es un email automático generado por el sistema de facturación.</p>
      <p>Mercure S.R.L. - Servicios de Transporte y Logística</p>
    </div>
  </div>
</body>
</html>
    `;

    const { data, error } = await resend.emails.send({
      from: `${config.from_name} <${config.from_email}>`,
      to: [params.to],
      bcc: config.bcc_emails,
      subject: `Factura ${params.invoiceNumber} - Mercure S.R.L.`,
      html: htmlContent,
      attachments: [
        {
          filename: `Factura_${params.invoiceNumber.replace('-', '_')}.pdf`,
          content: params.pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data?.id);
    return { success: true };
  } catch (error) {
    console.error('Error in sendInvoiceEmail:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

// Función para obtener email del cliente desde la entidad
export async function getClientEmail(entityId: number): Promise<string | null> {
  const { data, error } = await supabaseAdmin!
    .schema('mercure')
    .from('entities')
    .select('email')
    .eq('id', entityId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.email;
}

