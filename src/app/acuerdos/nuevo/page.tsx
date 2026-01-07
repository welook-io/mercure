"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Search, UserPlus, Building } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface EntityMatch {
  id: number;
  legal_name: string;
  tax_id: string | null;
  address: string | null;
}

export default function NuevoAcuerdoPage() {
  const router = useRouter();
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Búsqueda de cliente existente
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EntityMatch[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<EntityMatch | null>(null);
  const [isNewClient, setIsNewClient] = useState(false);

  // Datos del cliente nuevo
  const [newClient, setNewClient] = useState({
    name: "",
    cuit: "",
    address: "",
    phone: "",
    email: "",
    contactName: "",
  });

  // Condiciones comerciales solicitadas
  const [conditions, setConditions] = useState({
    tariffType: "base" as string,
    tariffModifier: 0,
    insuranceRate: 0.008,
    creditTerms: "contado" as string,
    creditDays: 0,
    paymentMethod: "transferencia" as string,
  });

  // Justificación
  const [justification, setJustification] = useState("");
  const [expectedVolume, setExpectedVolume] = useState("");

  // Buscar cliente existente
  const searchClients = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/search-entity?name=${encodeURIComponent(searchQuery)}`);
      const result = await response.json();
      
      if (result.suggestions) {
        setSearchResults(result.suggestions);
      } else if (result.entity) {
        setSearchResults([result.entity]);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Error buscando cliente:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Seleccionar cliente existente
  const selectClient = (entity: EntityMatch) => {
    setSelectedEntity(entity);
    setIsNewClient(false);
    setSearchResults([]);
    setSearchQuery("");
  };

  // Cambiar a cliente nuevo
  const switchToNewClient = () => {
    setIsNewClient(true);
    setSelectedEntity(null);
    setSearchResults([]);
  };

  // Guardar solicitud
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!selectedEntity && !isNewClient) {
      setError("Seleccioná un cliente existente o creá uno nuevo");
      return;
    }

    if (isNewClient && !newClient.name.trim()) {
      setError("El nombre del cliente es requerido");
      return;
    }

    if (!justification.trim()) {
      setError("La justificación es requerida para la aprobación");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/commercial-agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: selectedEntity?.id || null,
          newEntity: isNewClient ? newClient : null,
          conditions,
          justification,
          expectedVolume,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al guardar la solicitud");
      }

      router.push("/acuerdos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-12">
        <div className="px-3 sm:px-4 py-4 max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-neutral-200 pb-3 mb-4">
            <Link href="/acuerdos">
              <Button variant="ghost" className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-lg font-medium text-neutral-900">
              Nuevo Acuerdo Comercial
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* PASO 1: Seleccionar o crear cliente */}
            <div className="border border-neutral-200 rounded overflow-hidden">
              <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  1. Cliente
                </span>
              </div>
              
              <div className="p-3 space-y-3">
                {/* Cliente seleccionado */}
                {selectedEntity && (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-center gap-2">
                      <Building className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">{selectedEntity.legal_name}</p>
                        <p className="text-xs text-green-700">
                          {selectedEntity.tax_id || 'Sin CUIT'}
                          {selectedEntity.address && ` · ${selectedEntity.address}`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedEntity(null)}
                      className="text-xs text-green-600 hover:text-green-800"
                    >
                      Cambiar
                    </button>
                  </div>
                )}

                {/* Cliente nuevo */}
                {isNewClient && !selectedEntity && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-700">
                        <UserPlus className="h-5 w-5" />
                        <span className="font-medium">Cliente Nuevo</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsNewClient(false)}
                        className="text-xs text-neutral-500 hover:text-neutral-700"
                      >
                        Cancelar
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <Label className="text-xs mb-1 block">Razón Social / Nombre *</Label>
                        <Input
                          value={newClient.name}
                          onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="Nombre completo o razón social"
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">CUIT</Label>
                        <Input
                          value={newClient.cuit}
                          onChange={(e) => setNewClient({ ...newClient, cuit: e.target.value })}
                          className="h-8 text-sm font-mono"
                          placeholder="XX-XXXXXXXX-X"
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Teléfono</Label>
                        <Input
                          value={newClient.phone}
                          onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="011-XXXX-XXXX"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs mb-1 block">Dirección</Label>
                        <Input
                          value={newClient.address}
                          onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="Calle, número, localidad, provincia"
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Email</Label>
                        <Input
                          type="email"
                          value={newClient.email}
                          onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="email@empresa.com"
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Contacto</Label>
                        <Input
                          value={newClient.contactName}
                          onChange={(e) => setNewClient({ ...newClient, contactName: e.target.value })}
                          className="h-8 text-sm"
                          placeholder="Nombre del contacto"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Búsqueda */}
                {!selectedEntity && !isNewClient && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchClients())}
                        className="h-8 text-sm flex-1"
                        placeholder="Buscar cliente por nombre o CUIT..."
                      />
                      <Button
                        type="button"
                        onClick={searchClients}
                        disabled={isSearching}
                        className="h-8 px-3 text-sm bg-neutral-900 hover:bg-neutral-800 text-white"
                      >
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* Resultados */}
                    {searchResults.length > 0 && (
                      <div className="border border-neutral-200 rounded divide-y divide-neutral-100">
                        {searchResults.map((entity) => (
                          <button
                            key={entity.id}
                            type="button"
                            onClick={() => selectClient(entity)}
                            className="w-full text-left px-3 py-2 hover:bg-neutral-50 transition-colors"
                          >
                            <p className="font-medium text-sm">{entity.legal_name}</p>
                            <p className="text-xs text-neutral-500">
                              {entity.tax_id || 'Sin CUIT'}
                              {entity.address && ` · ${entity.address}`}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.length === 0 && searchQuery && !isSearching && (
                      <p className="text-xs text-neutral-500 text-center py-2">
                        No se encontraron resultados
                      </p>
                    )}

                    {/* Botón cliente nuevo */}
                    <button
                      type="button"
                      onClick={switchToNewClient}
                      className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-neutral-300 rounded text-sm text-neutral-600 hover:border-neutral-400 hover:text-neutral-700 transition-colors"
                    >
                      <UserPlus className="h-4 w-4" />
                      Cliente nuevo (no está en el sistema)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* PASO 2: Condiciones comerciales */}
            <div className="border border-neutral-200 rounded overflow-hidden">
              <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  2. Condiciones Comerciales Solicitadas
                </span>
              </div>
              
              <div className="p-3 space-y-4">
                {/* Tarifa */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Tipo de Tarifa</Label>
                    <select
                      value={conditions.tariffType}
                      onChange={(e) => setConditions({ ...conditions, tariffType: e.target.value })}
                      className="h-8 w-full px-2 text-sm border border-neutral-200 rounded bg-white"
                    >
                      <option value="base">Tarifa Base (más cara)</option>
                      <option value="base-10">Base -10%</option>
                      <option value="base-15">Base -15%</option>
                      <option value="base-20">Base -20%</option>
                      <option value="m3">Por M³</option>
                      <option value="especial">Especial (requiere detalle)</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Descuento/Recargo adicional</Label>
                    <select
                      value={conditions.tariffModifier}
                      onChange={(e) => setConditions({ ...conditions, tariffModifier: parseInt(e.target.value) })}
                      className="h-8 w-full px-2 text-sm border border-neutral-200 rounded bg-white"
                    >
                      <option value={-20}>-20% (máximo descuento)</option>
                      <option value={-15}>-15%</option>
                      <option value={-10}>-10%</option>
                      <option value={-5}>-5%</option>
                      <option value={0}>Sin modificación</option>
                      <option value={10}>+10% (recargo)</option>
                    </select>
                  </div>
                </div>

                {/* Condición de pago */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Condición de Pago</Label>
                    <select
                      value={conditions.creditTerms}
                      onChange={(e) => {
                        const terms = e.target.value;
                        setConditions({ 
                          ...conditions, 
                          creditTerms: terms,
                          creditDays: terms === 'contado' ? 0 : conditions.creditDays || 30
                        });
                      }}
                      className="h-8 w-full px-2 text-sm border border-neutral-200 rounded bg-white"
                    >
                      <option value="contado">Contado (contra entrega)</option>
                      <option value="cuenta_corriente">Cuenta Corriente</option>
                    </select>
                  </div>
                  {conditions.creditTerms === 'cuenta_corriente' && (
                    <div>
                      <Label className="text-xs mb-1 block">Días de crédito</Label>
                      <select
                        value={conditions.creditDays}
                        onChange={(e) => setConditions({ ...conditions, creditDays: parseInt(e.target.value) })}
                        className="h-8 w-full px-2 text-sm border border-neutral-200 rounded bg-white"
                      >
                        <option value={5}>5 días</option>
                        <option value={15}>15 días</option>
                        <option value={30}>30 días</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Forma de pago */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Forma de Pago</Label>
                    <select
                      value={conditions.paymentMethod}
                      onChange={(e) => setConditions({ ...conditions, paymentMethod: e.target.value })}
                      className="h-8 w-full px-2 text-sm border border-neutral-200 rounded bg-white"
                    >
                      <option value="transferencia">Transferencia</option>
                      <option value="cheque">Cheque</option>
                      <option value="efectivo">Efectivo</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Seguro (‰)</Label>
                    <select
                      value={conditions.insuranceRate}
                      onChange={(e) => setConditions({ ...conditions, insuranceRate: parseFloat(e.target.value) })}
                      className="h-8 w-full px-2 text-sm border border-neutral-200 rounded bg-white"
                    >
                      <option value={0.008}>8‰ (estándar)</option>
                      <option value={0.01}>10‰</option>
                      <option value={0.012}>12‰</option>
                      <option value={0.015}>15‰</option>
                    </select>
                  </div>
                </div>

                {/* Alerta si pide descuento */}
                {(conditions.tariffType !== 'base' || conditions.tariffModifier < 0) && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                    ⚠️ Las condiciones solicitadas son <strong>excepcionales</strong> respecto a la tarifa base.
                    Requieren justificación detallada para aprobación.
                  </div>
                )}
              </div>
            </div>

            {/* PASO 3: Justificación */}
            <div className="border border-neutral-200 rounded overflow-hidden">
              <div className="bg-neutral-50 px-3 py-2 border-b border-neutral-200">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  3. Justificación *
                </span>
              </div>
              
              <div className="p-3 space-y-3">
                <div>
                  <Label className="text-xs mb-1 block">
                    ¿Por qué se solicitan estas condiciones?
                  </Label>
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    className="w-full h-24 px-3 py-2 text-sm border border-neutral-200 rounded resize-none focus:outline-none focus:border-neutral-400"
                    placeholder="Ej: Cliente con alto volumen mensual, trayectoria de 5 años, referencias comerciales, competencia ofrece -15%, etc."
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">
                    Volumen esperado (opcional)
                  </Label>
                  <Input
                    value={expectedVolume}
                    onChange={(e) => setExpectedVolume(e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Ej: 50 envíos/mes, 2000kg/mes, $500.000/mes"
                  />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Acciones */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-xs text-neutral-500">
                Esta solicitud será enviada para aprobación de gerencia
              </p>
              <div className="flex gap-2">
                <Link href="/acuerdos">
                  <Button type="button" variant="outline" className="h-8 px-3 text-sm">
                    Cancelar
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="h-8 px-4 text-sm bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar para aprobación"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}












