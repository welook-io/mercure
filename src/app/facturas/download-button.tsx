'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface DownloadButtonProps {
  invoiceNumber: string;
  cae: string;
  caeExpiration: string;
  clienteCuit: string;
  clienteNombre: string;
  neto: number;
  iva: number;
  total: number;
  invoiceType: string;
}

export function DownloadButton({
  invoiceNumber,
  cae,
  caeExpiration,
  clienteCuit,
  clienteNombre,
  neto,
  iva,
  total,
  invoiceType,
}: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    
    try {
      const params = new URLSearchParams({
        invoiceNumber,
        cae,
        caeExpiration,
        clienteCuit,
        clienteNombre,
        neto: String(neto),
        iva: String(iva),
        total: String(total),
        invoiceType,
      });

      const response = await fetch(`/api/afip/generate-pdf?${params}`);
      
      if (!response.ok) {
        throw new Error('Error generando PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Factura_${invoiceNumber.replace('-', '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando PDF:', error);
      alert('Error al descargar el PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      PDF
    </button>
  );
}

