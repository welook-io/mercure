import os
import re

# Archivos a actualizar (páginas del servidor que deben usar supabaseAdmin)
server_files = [
    "src/app/operaciones/centros/page.tsx",
    "src/app/viajes/page.tsx",
    "src/app/facturas/page.tsx",
    "src/app/acuerdos/page.tsx",
    "src/app/recepcion/page.tsx",
    "src/app/vehiculos/page.tsx",
    "src/app/tarifas/page.tsx",
    "src/app/envios/page.tsx",
    "src/app/page.tsx",
    "src/app/operaciones/kanban/page.tsx",
    "src/app/vehiculos/nuevo/page.tsx",
    "src/app/vehiculos/[id]/page.tsx",
    "src/app/entidades/nueva/page.tsx",
    "src/app/consolidacion/page.tsx",
    "src/app/reparto/page.tsx",
    "src/app/cuentas-corrientes/page.tsx",
    "src/app/cuentas-corrientes/saldos-iniciales/page.tsx",
    "src/app/viajes/nuevo/page.tsx",
    "src/app/viajes/[id]/page.tsx",
    "src/app/factura_test/page.tsx",
    "src/app/liquidaciones/page.tsx",
    "src/app/liquidaciones/[id]/page.tsx",
    "src/app/envios/nuevo/page.tsx",
    "src/app/envios/[id]/editar/page.tsx",
    "src/app/arribo/page.tsx",
]

for filepath in server_files:
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            content = f.read()
        
        original = content
        
        # Cambiar import
        content = re.sub(
            r'import \{ supabase \} from ["\']@/lib/supabase["\']',
            'import { supabaseAdmin } from "@/lib/supabase"',
            content
        )
        content = re.sub(
            r'import \{ supabase, supabaseAdmin \} from ["\']@/lib/supabase["\']',
            'import { supabaseAdmin } from "@/lib/supabase"',
            content
        )
        
        # Cambiar uso (solo supabase. no supabaseAdmin.)
        content = re.sub(r'\bsupabase\.', 'supabaseAdmin.', content)
        # Evitar doble supabaseAdmin
        content = content.replace('supabaseAdminAdmin', 'supabaseAdmin')
        
        if content != original:
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"✅ {filepath}")
        else:
            print(f"⏭️ {filepath} (sin cambios)")
    else:
        print(f"❌ {filepath} (no existe)")

print("\nDone!")
