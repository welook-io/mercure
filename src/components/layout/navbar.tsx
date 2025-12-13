"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X, Wrench } from "lucide-react";
import { UserMenu } from "./user-menu";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const menuAreas = [
  {
    label: "Operaciones",
    items: [
      { href: "/", label: "Dashboard", description: "Vista general" },
      { href: "/operaciones/kanban", label: "Kanban", description: "Flujo de mercadería" },
      { href: "/recepcion", label: "Recepción", description: "Ingreso de mercadería" },
      { href: "/envios", label: "Envíos", description: "Remitos y seguimiento" },
      { href: "/viajes", label: "Viajes", description: "Planificación y despacho" },
      { href: "/vehiculos", label: "Vehículos", description: "Flota de transporte" },
      { href: "/procesos", label: "Procesos", description: "Documentación operativa" },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/entidades", label: "Entidades", description: "Clientes y proveedores" },
      { href: "/tarifas", label: "Tarifas", description: "Precios y cotizaciones" },
      { href: "/facturas", label: "Facturas", description: "Facturación y emisión" },
      { href: "/cobranzas", label: "Cobranzas", description: "Gestión de cobros" },
      { href: "/cuentas-corrientes", label: "Cuentas Corrientes", description: "Liquidaciones CC" },
      { href: "/pagos", label: "Pagos", description: "Pagos a proveedores" },
      { href: "/contabilidad", label: "Contabilidad", description: "Asientos y conciliaciones" },
    ],
  },
  {
    label: "RRHH",
    items: [
      { href: "/personal", label: "Personal", description: "Empleados y choferes" },
      { href: "/asistencia", label: "Asistencia", description: "Control de asistencia" },
      { href: "/vacaciones", label: "Vacaciones", description: "Licencias y ausencias" },
      { href: "/liquidaciones", label: "Liquidaciones", description: "Sueldos y recibos" },
      { href: "/legajos", label: "Legajos", description: "Documentación personal" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/whatsapp", label: "WhatsApp", description: "Mensajes automáticos" },
      { href: "/campanas", label: "Campañas", description: "Campañas de comunicación" },
      { href: "/redes", label: "Redes Sociales", description: "Publicaciones y métricas" },
      { href: "/agenda", label: "Agenda", description: "Contactos y seguimiento" },
      { href: "/reportes-mkt", label: "Reportes", description: "Métricas de marketing" },
    ],
  },
];

// Menú Admin solo para super admins
const adminMenu = {
  label: "Admin",
  items: [
    { href: "/admin/remito-debug", label: "Diseño Remito", description: "Vista previa de documentos" },
  ],
};

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isSuperAdmin } = useUserProfile();

  const isActiveArea = (items: { href: string }[]) => {
    return items.some(item => 
      pathname === item.href || 
      (item.href !== "/" && pathname.startsWith(item.href))
    );
  };

  return (
    <>
      <nav className="h-12 bg-zinc-900 flex items-center justify-between px-3 sm:px-4 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-3">
          {/* Hamburger menu - mobile only */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-8 h-8 text-white hover:bg-zinc-800 rounded"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/kalia_logos/kalia_logo_white.svg"
              alt="Kalia"
              width={70}
              height={20}
              priority
            />
            <span className="text-zinc-500 text-sm hidden sm:inline">•</span>
            <span className="text-white text-sm font-medium hidden sm:inline">Mercure SRL</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-1 ml-2">
            {menuAreas.map((area) => (
              <DropdownMenu key={area.label}>
                <DropdownMenuTrigger asChild>
                  <button
                    suppressHydrationWarning
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-sm rounded transition-colors outline-none ${
                      isActiveArea(area.items)
                        ? "text-white font-medium"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {area.label}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start" 
                  className="w-56 bg-white border-neutral-200"
                >
                  <DropdownMenuLabel className="text-xs text-neutral-500 uppercase tracking-wide">
                    {area.label}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {area.items.map((item) => {
                    const isActive = pathname === item.href || 
                      (item.href !== "/" && pathname.startsWith(item.href));
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          href={item.href}
                          className={`flex flex-col items-start gap-0 cursor-pointer ${
                            isActive ? "bg-neutral-50" : ""
                          }`}
                        >
                          <span className={`text-sm ${isActive ? "font-medium text-orange-500" : "text-neutral-900"}`}>
                            {item.label}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {item.description}
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ))}

            {/* Admin Menu - Solo para Super Admins */}
            {isSuperAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    suppressHydrationWarning
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-sm rounded transition-colors outline-none ${
                      isActiveArea(adminMenu.items)
                        ? "text-orange-400 font-medium"
                        : "text-orange-500/70 hover:text-orange-400"
                    }`}
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    {adminMenu.label}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start" 
                  className="w-56 bg-white border-orange-200"
                >
                  <DropdownMenuLabel className="text-xs text-orange-600 uppercase tracking-wide flex items-center gap-1.5">
                    <Wrench className="h-3 w-3" />
                    {adminMenu.label}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {adminMenu.items.map((item) => {
                    const isActive = pathname === item.href || 
                      (item.href !== "/" && pathname.startsWith(item.href));
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          href={item.href}
                          className={`flex flex-col items-start gap-0 cursor-pointer ${
                            isActive ? "bg-orange-50" : ""
                          }`}
                        >
                          <span className={`text-sm ${isActive ? "font-medium text-orange-600" : "text-neutral-900"}`}>
                            {item.label}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {item.description}
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        
        <UserMenu />
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile menu panel */}
      <div className={`fixed top-12 left-0 bottom-0 w-72 bg-white z-40 transform transition-transform duration-200 md:hidden overflow-y-auto ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Org name en mobile */}
        <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
          <p className="text-xs text-neutral-500 uppercase tracking-wide">Organización</p>
          <p className="text-sm font-medium text-neutral-900">Mercure SRL</p>
        </div>

        {menuAreas.map((area) => (
          <div key={area.label} className="border-b border-neutral-100">
            <div className="px-4 py-2 bg-neutral-50">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                {area.label}
              </span>
            </div>
            <div className="py-1">
              {area.items.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex flex-col px-4 py-2.5 ${
                      isActive ? "bg-orange-50 border-l-2 border-orange-500" : "hover:bg-neutral-50"
                    }`}
                  >
                    <span className={`text-sm ${isActive ? "font-medium text-orange-600" : "text-neutral-900"}`}>
                      {item.label}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {item.description}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Admin Menu Mobile - Solo para Super Admins */}
        {isSuperAdmin && (
          <div className="border-b border-orange-200">
            <div className="px-4 py-2 bg-orange-50 flex items-center gap-2">
              <Wrench className="h-3 w-3 text-orange-600" />
              <span className="text-xs font-medium text-orange-600 uppercase tracking-wide">
                {adminMenu.label}
              </span>
            </div>
            <div className="py-1">
              {adminMenu.items.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex flex-col px-4 py-2.5 ${
                      isActive ? "bg-orange-100 border-l-2 border-orange-500" : "hover:bg-orange-50"
                    }`}
                  >
                    <span className={`text-sm ${isActive ? "font-medium text-orange-600" : "text-neutral-900"}`}>
                      {item.label}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {item.description}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
