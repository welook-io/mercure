/**
 * Cliente WSFE (Web Service de Facturación Electrónica) de AFIP
 * Documentación: https://www.afip.gob.ar/ws/documentacion/ws-factura-electronica.asp
 */

import { getWSAACredentials, getAfipConfig } from './wsaa';
import { AFIP_URLS, CreateInvoiceRequest, InvoiceResponse, INVOICE_TYPE_CODES, InvoiceType } from './types';

async function getWSFEUrl(): Promise<string> {
  const config = await getAfipConfig();
  return AFIP_URLS[config.environment].wsfe;
}

async function getCuitEmisor(): Promise<string> {
  const config = await getAfipConfig();
  return config.cuit.replace(/-/g, '');
}

/**
 * Obtener último número de comprobante autorizado
 */
export async function getLastVoucherNumber(pointOfSale: number, invoiceType: InvoiceType): Promise<number> {
  const credentials = await getWSAACredentials('wsfe');
  const cuitEmisor = await getCuitEmisor();
  const wsfeUrl = await getWSFEUrl();
  const cbte_tipo = INVOICE_TYPE_CODES[invoiceType];
  
  const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soap:Body>
    <ar:FECompUltimoAutorizado>
      <ar:Auth>
        <ar:Token>${credentials.token}</ar:Token>
        <ar:Sign>${credentials.sign}</ar:Sign>
        <ar:Cuit>${cuitEmisor}</ar:Cuit>
      </ar:Auth>
      <ar:PtoVta>${pointOfSale}</ar:PtoVta>
      <ar:CbteTipo>${cbte_tipo}</ar:CbteTipo>
    </ar:FECompUltimoAutorizado>
  </soap:Body>
</soap:Envelope>`;

  try {
    const response = await fetch(wsfeUrl.replace('?WSDL', ''), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado',
      },
      body: soapRequest,
    });

    const xmlText = await response.text();
    
    // Parse response
    const nroMatch = xmlText.match(/<CbteNro>(\d+)<\/CbteNro>/);
    if (nroMatch) {
      return parseInt(nroMatch[1], 10);
    }
    
    console.error('WSFE FECompUltimoAutorizado response:', xmlText);
    return 0;
  } catch (error) {
    console.error('Error en FECompUltimoAutorizado:', error);
    throw error;
  }
}

/**
 * Crear factura electrónica y obtener CAE
 */
export async function createInvoice(request: CreateInvoiceRequest): Promise<InvoiceResponse> {
  const credentials = await getWSAACredentials('wsfe');
  const cuitEmisor = await getCuitEmisor();
  const wsfeUrl = await getWSFEUrl();
  const cbte_tipo = INVOICE_TYPE_CODES[request.invoiceType];
  
  // Obtener último número y calcular el siguiente
  const lastNumber = await getLastVoucherNumber(request.pointOfSale, request.invoiceType);
  const nextNumber = lastNumber + 1;
  
  // Redondear montos a 2 decimales
  const impNeto = Math.round(request.netAmount * 100) / 100;
  const impIVA = Math.round(request.ivaAmount * 100) / 100;
  const impTotal = Math.round(request.totalAmount * 100) / 100;
  
  // Armar request SOAP para FECAESolicitar
  const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soap:Body>
    <ar:FECAESolicitar>
      <ar:Auth>
        <ar:Token>${credentials.token}</ar:Token>
        <ar:Sign>${credentials.sign}</ar:Sign>
        <ar:Cuit>${cuitEmisor}</ar:Cuit>
      </ar:Auth>
      <ar:FeCAEReq>
        <ar:FeCabReq>
          <ar:CantReg>1</ar:CantReg>
          <ar:PtoVta>${request.pointOfSale}</ar:PtoVta>
          <ar:CbteTipo>${cbte_tipo}</ar:CbteTipo>
        </ar:FeCabReq>
        <ar:FeDetReq>
          <ar:FECAEDetRequest>
            <ar:Concepto>${request.concept}</ar:Concepto>
            <ar:DocTipo>${request.docType}</ar:DocTipo>
            <ar:DocNro>${request.docNumber}</ar:DocNro>
            <ar:CbteDesde>${nextNumber}</ar:CbteDesde>
            <ar:CbteHasta>${nextNumber}</ar:CbteHasta>
            <ar:CbteFch>${request.invoiceDate}</ar:CbteFch>
            <ar:ImpTotal>${impTotal.toFixed(2)}</ar:ImpTotal>
            <ar:ImpTotConc>0.00</ar:ImpTotConc>
            <ar:ImpNeto>${impNeto.toFixed(2)}</ar:ImpNeto>
            <ar:ImpOpEx>0.00</ar:ImpOpEx>
            <ar:ImpTrib>0.00</ar:ImpTrib>
            <ar:ImpIVA>${impIVA.toFixed(2)}</ar:ImpIVA>
            ${request.serviceFrom ? `<ar:FchServDesde>${request.serviceFrom}</ar:FchServDesde>` : ''}
            ${request.serviceTo ? `<ar:FchServHasta>${request.serviceTo}</ar:FchServHasta>` : ''}
            ${request.paymentDueDate ? `<ar:FchVtoPago>${request.paymentDueDate}</ar:FchVtoPago>` : ''}
            <ar:MonId>PES</ar:MonId>
            <ar:MonCotiz>1</ar:MonCotiz>
            <ar:Iva>
              <ar:AlicIva>
                <ar:Id>5</ar:Id>
                <ar:BaseImp>${impNeto.toFixed(2)}</ar:BaseImp>
                <ar:Importe>${impIVA.toFixed(2)}</ar:Importe>
              </ar:AlicIva>
            </ar:Iva>
          </ar:FECAEDetRequest>
        </ar:FeDetReq>
      </ar:FeCAEReq>
    </ar:FECAESolicitar>
  </soap:Body>
</soap:Envelope>`;

  try {
    console.log('WSFE Request:', soapRequest);
    
    const response = await fetch(wsfeUrl.replace('?WSDL', ''), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://ar.gov.afip.dif.FEV1/FECAESolicitar',
      },
      body: soapRequest,
    });

    const xmlText = await response.text();
    console.log('WSFE Response:', xmlText);
    
    // Parse response
    const caeMatch = xmlText.match(/<CAE>(\d+)<\/CAE>/);
    const caeVtoMatch = xmlText.match(/<CAEFchVto>(\d+)<\/CAEFchVto>/);
    const resultMatch = xmlText.match(/<Resultado>(\w+)<\/Resultado>/);
    
    // Check for errors
    const errorsMatch = xmlText.match(/<Err>[\s\S]*?<Code>(\d+)<\/Code>[\s\S]*?<Msg>(.*?)<\/Msg>[\s\S]*?<\/Err>/g);
    const obsMatch = xmlText.match(/<Obs>[\s\S]*?<Code>(\d+)<\/Code>[\s\S]*?<Msg>(.*?)<\/Msg>[\s\S]*?<\/Obs>/g);
    
    const errors = errorsMatch?.map(e => {
      const code = e.match(/<Code>(\d+)<\/Code>/)?.[1] || '0';
      const msg = e.match(/<Msg>(.*?)<\/Msg>/)?.[1] || 'Unknown error';
      return { code: parseInt(code), message: msg };
    });
    
    const observations = obsMatch?.map(o => {
      const code = o.match(/<Code>(\d+)<\/Code>/)?.[1] || '0';
      const msg = o.match(/<Msg>(.*?)<\/Msg>/)?.[1] || '';
      return { code: parseInt(code), message: msg };
    });

    if (resultMatch && resultMatch[1] === 'A' && caeMatch) {
      return {
        success: true,
        cae: caeMatch[1],
        caeExpiration: caeVtoMatch?.[1],
        invoiceNumber: nextNumber,
        observations,
        rawResponse: xmlText,
      };
    } else {
      return {
        success: false,
        errors: errors || [{ code: -1, message: 'Error desconocido en respuesta AFIP' }],
        observations,
        rawResponse: xmlText,
      };
    }
  } catch (error) {
    console.error('Error en FECAESolicitar:', error);
    return {
      success: false,
      errors: [{ code: -1, message: error instanceof Error ? error.message : 'Error de conexión' }],
    };
  }
}

/**
 * Obtener puntos de venta habilitados
 */
export async function getPointsOfSale(): Promise<{
  success: boolean;
  pointsOfSale?: Array<{
    number: number;
    type: string;
    blocked: boolean;
    dateDeleted?: string;
  }>;
  error?: string;
}> {
  try {
    const credentials = await getWSAACredentials('wsfe');
    const cuitEmisor = await getCuitEmisor();
    const wsfeUrl = await getWSFEUrl();
    
    const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soap:Body>
    <ar:FEParamGetPtosVenta>
      <ar:Auth>
        <ar:Token>${credentials.token}</ar:Token>
        <ar:Sign>${credentials.sign}</ar:Sign>
        <ar:Cuit>${cuitEmisor}</ar:Cuit>
      </ar:Auth>
    </ar:FEParamGetPtosVenta>
  </soap:Body>
</soap:Envelope>`;

    const response = await fetch(wsfeUrl.replace('?WSDL', ''), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://ar.gov.afip.dif.FEV1/FEParamGetPtosVenta',
      },
      body: soapRequest,
    });

    const xmlText = await response.text();
    console.log('FEParamGetPtosVenta Response:', xmlText);
    
    // Parse puntos de venta
    const ptosVentaMatches = xmlText.matchAll(/<PtoVenta>[\s\S]*?<Nro>(\d+)<\/Nro>[\s\S]*?<EmisionTipo>(.*?)<\/EmisionTipo>[\s\S]*?<Bloqueado>(.*?)<\/Bloqueado>[\s\S]*?<\/PtoVenta>/g);
    
    const pointsOfSale: Array<{ number: number; type: string; blocked: boolean; dateDeleted?: string }> = [];
    
    for (const match of ptosVentaMatches) {
      pointsOfSale.push({
        number: parseInt(match[1]),
        type: match[2],
        blocked: match[3] === 'S',
      });
    }
    
    return { success: true, pointsOfSale };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de conexión',
    };
  }
}

/**
 * Verificar estado del servicio
 */
export async function checkServiceStatus(): Promise<{
  appServer: boolean;
  dbServer: boolean;
  authServer: boolean;
}> {
  const wsfeUrl = await getWSFEUrl();
  
  const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soap:Body>
    <ar:FEDummy />
  </soap:Body>
</soap:Envelope>`;

  try {
    const response = await fetch(wsfeUrl.replace('?WSDL', ''), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://ar.gov.afip.dif.FEV1/FEDummy',
      },
      body: soapRequest,
    });

    const xmlText = await response.text();
    
    return {
      appServer: xmlText.includes('<AppServer>OK</AppServer>'),
      dbServer: xmlText.includes('<DbServer>OK</DbServer>'),
      authServer: xmlText.includes('<AuthServer>OK</AuthServer>'),
    };
  } catch (error) {
    return {
      appServer: false,
      dbServer: false,
      authServer: false,
    };
  }
}
