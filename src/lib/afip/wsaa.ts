/**
 * Cliente WSAA (Web Service de Autenticación y Autorización) de AFIP
 * Documentación: https://www.afip.gob.ar/ws/documentacion/wsaa.asp
 */

import * as forge from 'node-forge';
import { WSAACredentials } from './types';
import { supabaseAdmin } from "@/lib/supabase";

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
    .schema('mercure')
    .from('afip_config')
    .select('certificate, private_key, cuit, environment')
    .eq('is_active', true)
    .single();

  if (error || !data) {
    throw new Error('Configuración de AFIP no encontrada en Supabase. Sube los certificados en la tabla mercure.afip_config.');
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
 * Firma el TRA usando PKCS#7/CMS con node-forge
 * AFIP espera un CMS SignedData en base64
 */
async function signTRA(tra: string, certPem: string, keyPem: string): Promise<string> {
  // Parsear certificado y clave privada
  const cert = forge.pki.certificateFromPem(certPem);
  const privateKey = forge.pki.privateKeyFromPem(keyPem);
  
  // Crear el mensaje PKCS#7 firmado
  const p7 = forge.pkcs7.createSignedData();
  
  // Agregar el contenido (TRA XML)
  p7.content = forge.util.createBuffer(tra, 'utf8');
  
  // Agregar el certificado
  p7.addCertificate(cert);
  
  // Agregar el firmante
  p7.addSigner({
    key: privateKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data,
      },
      {
        type: forge.pki.oids.messageDigest,
        // El valor se calcula automáticamente
      },
      {
        type: forge.pki.oids.signingTime,
        value: new Date().toISOString(),
      },
    ],
  });
  
  // Firmar
  p7.sign();
  
  // Convertir a DER y luego a base64
  const asn1 = p7.toAsn1();
  const der = forge.asn1.toDer(asn1);
  const base64 = forge.util.encode64(der.getBytes());
  
  return base64;
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
