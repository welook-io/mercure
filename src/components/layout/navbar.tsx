"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { UserMenu } from "./user-menu";
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

export function Navbar() {
  const pathname = usePathname();

  const isActiveArea = (items: { href: string }[]) => {
    return items.some(item => 
      pathname === item.href || 
      (item.href !== "/" && pathname.startsWith(item.href))
    );
  };

  return (
    <nav className="h-12 bg-zinc-900 flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/kalia_logos/kalia_logo_white.svg"
            alt="Kalia"
            width={70}
            height={20}
            priority
          />
        </Link>
        
        <div className="hidden md:flex items-center gap-1">
          {menuAreas.map((area) => (
            <DropdownMenu key={area.label}>
              <DropdownMenuTrigger asChild>
                <button
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
        </div>
      </div>
      
      <UserMenu />
    </nav>
  );
}
