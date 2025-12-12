"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, ImageIcon, X, Plus, RotateCcw, FileText, Package } from "lucide-react";

export interface CapturedImage {
  id: string;
  file: File;
  preview: string;
  type: 'remito' | 'carga';
  // Para cargas: si es otra vista del mismo bulto o un bulto nuevo
  cargoMeta?: {
    bultoIndex: number; // Qué bulto es (1, 2, 3...)
    isAlternateView: boolean; // true = otra vista del mismo bulto
  };
}

interface ImageCaptureProps {
  images: CapturedImage[];
  onImagesChange: (images: CapturedImage[]) => void;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
}

export function ImageCapture({ images, onImagesChange, onAnalyze, isAnalyzing }: ImageCaptureProps) {
  const [activeTab, setActiveTab] = useState<'remito' | 'carga'>('remito');
  const [isDragging, setIsDragging] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const remitoImages = images.filter(img => img.type === 'remito');
  const cargaImages = images.filter(img => img.type === 'carga');

  // Generar ID único
  const generateId = () => `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Procesar archivos
  const processFiles = useCallback((files: FileList | File[], type: 'remito' | 'carga') => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImage: CapturedImage = {
          id: generateId(),
          file,
          preview: reader.result as string,
          type,
          cargoMeta: type === 'carga' ? {
            // Por defecto, cada nueva foto de carga es un bulto nuevo
            bultoIndex: cargaImages.length + 1,
            isAlternateView: false,
          } : undefined,
        };
        onImagesChange([...images, newImage]);
      };
      reader.readAsDataURL(file);
    });
  }, [images, cargaImages.length, onImagesChange]);

  // Handlers
  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleGallerySelect = () => {
    galleryInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, type: 'remito' | 'carga') => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files, type);
    }
    // Reset input para permitir seleccionar el mismo archivo
    e.target.value = '';
  };

  const removeImage = (id: string) => {
    onImagesChange(images.filter(img => img.id !== id));
  };

  // Cambiar metadata de carga (marcar como vista alternativa)
  const toggleAlternateView = (id: string) => {
    onImagesChange(images.map(img => {
      if (img.id === id && img.cargoMeta) {
        return {
          ...img,
          cargoMeta: {
            ...img.cargoMeta,
            isAlternateView: !img.cargoMeta.isAlternateView,
          }
        };
      }
      return img;
    }));
  };

  // Drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files, activeTab);
    }
  }, [processFiles, activeTab]);

  return (
    <div className="space-y-3">
      {/* Inputs ocultos */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileInput(e, activeTab)}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileInput(e, activeTab)}
        className="hidden"
      />

      {/* Tabs de categoría */}
      <div className="flex border-b border-neutral-200">
        <button
          type="button"
          onClick={() => setActiveTab('remito')}
          className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'remito'
              ? 'text-orange-600 border-orange-500'
              : 'text-neutral-500 border-transparent hover:text-neutral-700'
          }`}
        >
          <FileText className="h-4 w-4 inline mr-1.5" />
          Remito{remitoImages.length > 0 && ` (${remitoImages.length})`}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('carga')}
          className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'carga'
              ? 'text-orange-600 border-orange-500'
              : 'text-neutral-500 border-transparent hover:text-neutral-700'
          }`}
        >
          <Package className="h-4 w-4 inline mr-1.5" />
          Carga{cargaImages.length > 0 && ` (${cargaImages.length})`}
        </button>
      </div>

      {/* Área de contenido */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`min-h-[120px] rounded-lg border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-orange-400 bg-orange-50'
            : 'border-neutral-200 bg-neutral-50'
        }`}
      >
        {/* Imágenes existentes */}
        {(activeTab === 'remito' ? remitoImages : cargaImages).length > 0 ? (
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2">
              {(activeTab === 'remito' ? remitoImages : cargaImages).map((img, idx) => (
                <div key={img.id} className="relative group">
                  <div className="aspect-square bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200">
                    <img
                      src={img.preview}
                      alt={`${activeTab} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Badge de número */}
                  <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-neutral-900/80 text-white text-xs flex items-center justify-center font-medium">
                    {idx + 1}
                  </div>

                  {/* Botón eliminar */}
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>

                  {/* Para cargas: toggle vista alternativa */}
                  {activeTab === 'carga' && img.cargoMeta && (
                    <button
                      type="button"
                      onClick={() => toggleAlternateView(img.id)}
                      className={`absolute bottom-1 left-1 right-1 text-[10px] py-0.5 rounded text-center transition-colors ${
                        img.cargoMeta.isAlternateView
                          ? 'bg-blue-500 text-white'
                          : 'bg-neutral-800/70 text-neutral-200'
                      }`}
                    >
                      {img.cargoMeta.isAlternateView ? '📐 Vista alt.' : '📦 Bulto'}
                    </button>
                  )}
                </div>
              ))}

              {/* Botón agregar más */}
              <button
                type="button"
                onClick={handleGallerySelect}
                className="aspect-square rounded-lg border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center text-neutral-400 hover:text-neutral-600 hover:border-neutral-400 transition-colors"
              >
                <Plus className="h-6 w-6" />
                <span className="text-[10px] mt-1">Agregar</span>
              </button>
            </div>
          </div>
        ) : (
          /* Estado vacío - Botones grandes para mobile */
          <div className="p-4 flex flex-col items-center justify-center">
            <p className="text-sm text-neutral-600 mb-3 text-center">
              {activeTab === 'remito'
                ? 'Sacá foto del remito (puede tener varias hojas)'
                : 'Sacá fotos de los bultos'
              }
            </p>
          </div>
        )}
      </div>

      {/* Botones de acción - siempre visibles */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleCameraCapture}
          className="flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
        >
          <Camera className="h-5 w-5" />
          <span>Sacar foto</span>
        </button>
        <button
          type="button"
          onClick={handleGallerySelect}
          className="flex items-center justify-center gap-2 py-3 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded-lg font-medium transition-colors"
        >
          <ImageIcon className="h-5 w-5" />
          <span>Galería</span>
        </button>
      </div>

      {/* Ayuda contextual */}
      <div className="text-xs text-neutral-500 px-1">
        {activeTab === 'remito' ? (
          <p>💡 Si el remito tiene más de una hoja, sacá foto de cada una.</p>
        ) : (
          <p>💡 Tocá el label debajo de cada foto para marcar si es otra vista del mismo bulto o un bulto diferente.</p>
        )}
      </div>

      {/* Resumen rápido */}
      {images.length > 0 && (
        <div className="flex items-center justify-between text-xs text-neutral-500 bg-neutral-100 rounded px-3 py-2">
          <div className="flex gap-3">
            <span>{remitoImages.length} remito{remitoImages.length !== 1 ? 's' : ''}</span>
            <span>{cargaImages.length} foto{cargaImages.length !== 1 ? 's' : ''} de carga</span>
          </div>
          {images.length > 0 && (
            <button
              type="button"
              onClick={() => onImagesChange([])}
              className="text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Limpiar
            </button>
          )}
        </div>
      )}
    </div>
  );
}


