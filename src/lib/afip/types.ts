// Tipos para integración con AFIP

export type InvoiceType = 'A' | 'B' | 'C';

export const INVOICE_TYPE_CODES: Record<InvoiceType, number> = {
  'A': 1,
  'B': 6,
  'C': 11,
};

export const CONCEPT_CODES = {
  PRODUCTOS: 1,
  SERVICIOS: 2,
  PRODUCTOS_Y_SERVICIOS: 3,
} as const;

export const DOC_TYPE_CODES = {
  CUIT: 80,
  CUIL: 86,
  DNI: 96,
  CONSUMIDOR_FINAL: 99,
} as const;

export interface WSAACredentials {
  token: string;
  sign: string;
  expirationTime: Date;
}

export interface CreateInvoiceRequest {
  invoiceType: InvoiceType;
  pointOfSale: number;
  concept: number;
  docType: number;
  docNumber: string;
  invoiceDate: string;
  totalAmount: number;
  netAmount: number;
  ivaAmount: number;
  serviceFrom?: string;
  serviceTo?: string;
  paymentDueDate?: string;
}

export interface InvoiceResponse {
  success: boolean;
  cae?: string;
  caeExpiration?: string;
  invoiceNumber?: number;
  errors?: AFIPError[];
  observations?: AFIPObservation[];
  rawResponse?: unknown;
}

export interface AFIPError {
  code: number;
  message: string;
}

export interface AFIPObservation {
  code: number;
  message: string;
}

export const AFIP_URLS = {
  production: {
    wsaa: 'https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL',
    wsfe: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL',
  },
  testing: {
    wsaa: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL',
    wsfe: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL',
  },
} as const;

