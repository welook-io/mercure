import os
import re

# API routes y lib files que deben usar supabaseAdmin
files = [
    "src/lib/afip/wsaa.ts",
    "src/lib/email.ts",
    "src/app/api/afip/invoice/route.ts",
    "src/app/api/afip/factura-directa/route.ts",
    "src/app/api/afip/factura-nueva/route.ts",
]

for filepath in files:
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
        
        # Cambiar uso
        content = re.sub(r'\bsupabase\.', 'supabaseAdmin.', content)
        content = content.replace('supabaseAdminAdmin', 'supabaseAdmin')
        
        if content != original:
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"✅ {filepath}")
        else:
            print(f"⏭️ {filepath} (sin cambios)")

print("\nDone!")
