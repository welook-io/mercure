/**
 * Cliente WSAA (Web Service de Autenticación y Autorización) de AFIP
 * Documentación: https://www.afip.gob.ar/ws/documentacion/wsaa.asp
 */

import * as crypto from 'crypto';
import { AFIP_URLS, WSAACredentials } from './types';
import { supabase } from '@/lib/supabase';

let cachedCredentials: Record<string, WSAACredentials> = {};
let cachedAfipConfig: { cert: string; key: string; cuit: string; environment: 'testing' | 'production' } | null = null;

/**
 * Obtiene la configuración de AFIP desde Supabase
 */
async function getAfipConfig(): Promise<{ cert: string; key: string; cuit: string; environment: 'testing' | 'production' }> {
  if (cachedAfipConfig) {
    return cachedAfipConfig;
  }

  const { data, error } = await supabase
    .from('mercure_afip_config')
    .select('certificate, private_key, cuit, environment')
    .eq('is_active', true)
    .single();

  if (error || !data) {
    throw new Error('Configuración de AFIP no encontrada en Supabase. Sube los certificados en la tabla mercure_afip_config.');
  }

  cachedAfipConfig = {
    cert: data.certificate,
    key: data.private_key,
    cuit: data.cuit,
    environment: data.environment as 'testing' | 'production',
  };

  return cachedAfipConfig;
}

export function invalidateAfipConfigCache(): void {
  cachedAfipConfig = null;
}

export { getAfipConfig };

function getEnvironmentFromEnv(): 'production' | 'testing' {
  return (process.env.AFIP_ENV || 'testing') as 'production' | 'testing';
}

function getWSAAUrl(environment: 'production' | 'testing'): string {
  // Usar endpoint directo, no WSDL
  if (environment === 'production') {
    return 'https://wsaa.afip.gov.ar/ws/services/LoginCms';
  }
  return 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms';
}

/**
 * Genera el TRA (Ticket de Requerimiento de Acceso)
 */
function generateTRA(service: string): string {
  const now = new Date();
  const expiration = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutos
  
  // Formatear fechas en formato ISO con timezone Argentina (UTC-3)
  const formatDate = (d: Date) => {
    // Calcular la hora de Argentina (UTC-3)
    const argentinaTime = new Date(d.getTime() - (3 * 60 * 60 * 1000));
    const iso = argentinaTime.toISOString();
    // Formato: 2025-12-12T16:30:00-03:00
    return iso.replace('Z', '-03:00').replace(/\.\d{3}/, '');
  };
  
  const uniqueId = Math.floor(now.getTime() / 1000);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${formatDate(now)}</generationTime>
    <expirationTime>${formatDate(expiration)}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
}

/**
 * Firma el TRA usando PKCS#7/CMS con OpenSSL via crypto
 * AFIP espera un CMS SignedData en base64
 */
async function signTRA(tra: string, certPem: string, keyPem: string): Promise<string> {
  // Para crear una firma CMS válida para AFIP, necesitamos usar openssl
  // o una librería que implemente CMS/PKCS#7 SignedData
  
  // Alternativa: Ejecutar openssl desde Node.js
  const { execSync, spawnSync } = await import('child_process');
  const fs = await import('fs');
  const os = await import('os');
  const path = await import('path');
  
  // Crear archivos temporales
  const tmpDir = os.tmpdir();
  const traPath = path.join(tmpDir, `tra_${Date.now()}.xml`);
  const certPath = path.join(tmpDir, `cert_${Date.now()}.crt`);
  const keyPath = path.join(tmpDir, `key_${Date.now()}.key`);
  const cmsPath = path.join(tmpDir, `cms_${Date.now()}.cms`);
  
  try {
    // Escribir archivos
    fs.writeFileSync(traPath, tra);
    fs.writeFileSync(certPath, certPem);
    fs.writeFileSync(keyPath, keyPem);
    
    // Ejecutar openssl smime para crear CMS
    const cmd = `openssl smime -sign -signer "${certPath}" -inkey "${keyPath}" -in "${traPath}" -outform DER -nodetach -out "${cmsPath}"`;
    
    execSync(cmd, { stdio: 'pipe' });
    
    // Leer el resultado en base64
    const cms = fs.readFileSync(cmsPath);
    return cms.toString('base64');
    
  } finally {
    // Limpiar archivos temporales
    try {
      fs.unlinkSync(traPath);
      fs.unlinkSync(certPath);
      fs.unlinkSync(keyPath);
      fs.unlinkSync(cmsPath);
    } catch (e) {
      // Ignorar errores de limpieza
    }
  }
}

/**
 * Obtiene credenciales del WSAA (token y sign)
 */
export async function getWSAACredentials(service: string = 'wsfe'): Promise<WSAACredentials> {
  // Verificar cache
  const cached = cachedCredentials[service];
  if (cached && cached.expirationTime > new Date()) {
    console.log('WSAA: Usando credenciales cacheadas para', service);
    return cached;
  }

  // Obtener configuración desde Supabase
  const config = await getAfipConfig();
  const { cert, key, environment } = config;

  // Decodificar certificados de base64 si es necesario
  let certPem = cert;
  let keyPem = key;
  
  if (!cert.includes('-----BEGIN')) {
    certPem = Buffer.from(cert, 'base64').toString('utf-8');
  }
  if (!key.includes('-----BEGIN')) {
    keyPem = Buffer.from(key, 'base64').toString('utf-8');
  }

  console.log(`WSAA: Autenticando en ambiente ${environment} para servicio ${service}`);

  // Generar TRA
  const tra = generateTRA(service);
  console.log('WSAA TRA generado');
  
  // Firmar TRA
  const cms = await signTRA(tra, certPem, keyPem);
  console.log('WSAA TRA firmado, CMS length:', cms.length);
  
  // Llamada SOAP al WSAA
  const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cms}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

  try {
    console.log('WSAA: Enviando request a', getWSAAUrl(environment));
    
    const response = await fetch(getWSAAUrl(environment), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '',
      },
      body: soapRequest,
    });

    const xmlText = await response.text();
    console.log('WSAA Response status:', response.status);
    console.log('WSAA Response (primeros 1000 chars):', xmlText.substring(0, 1000));
    
    // Check for SOAP Fault
    if (xmlText.includes('<faultstring>')) {
      const faultMatch = xmlText.match(/<faultstring>([\s\S]*?)<\/faultstring>/);
      throw new Error(`WSAA Fault: ${faultMatch ? faultMatch[1] : 'Error desconocido'}`);
    }
    
    // Parse response
    const loginCmsReturnMatch = xmlText.match(/<loginCmsReturn>([\s\S]*?)<\/loginCmsReturn>/);
    
    if (!loginCmsReturnMatch) {
      console.error('WSAA: No se encontró loginCmsReturn en respuesta');
      console.error('WSAA Full response:', xmlText);
      throw new Error('WSAA: Respuesta no válida');
    }
    
    // Decodificar HTML entities
    const taXml = loginCmsReturnMatch[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#xD;/g, '')
      .replace(/&#xA;/g, '\n');
    
    console.log('WSAA TA XML:', taXml.substring(0, 500));
    
    const tokenMatch = taXml.match(/<token>([\s\S]*?)<\/token>/);
    const signMatch = taXml.match(/<sign>([\s\S]*?)<\/sign>/);
    const expMatch = taXml.match(/<expirationTime>([\s\S]*?)<\/expirationTime>/);
    
    if (!tokenMatch || !signMatch) {
      console.error('WSAA: No se encontraron token/sign');
      console.error('TA XML:', taXml);
      throw new Error('WSAA: No se encontraron token/sign en respuesta');
    }
    
    const credentials: WSAACredentials = {
      token: tokenMatch[1].trim(),
      sign: signMatch[1].trim(),
      expirationTime: expMatch ? new Date(expMatch[1]) : new Date(Date.now() + 12 * 60 * 60 * 1000),
    };
    
    cachedCredentials[service] = credentials;
    console.log('WSAA: Credenciales obtenidas exitosamente');
    console.log('WSAA: Token (primeros 50 chars):', credentials.token.substring(0, 50));
    console.log('WSAA: Expira:', credentials.expirationTime);
    
    return credentials;
  } catch (error) {
    console.error('WSAA Error:', error);
    throw error;
  }
}

export function invalidateWSAACache(): void {
  cachedCredentials = {};
}

export function hasValidCredentials(service: string = 'wsfe'): boolean {
  const cached = cachedCredentials[service];
  return cached !== null && cached !== undefined && cached.expirationTime > new Date();
}
