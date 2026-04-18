# Cosas de Cosas

Chat two-way entre Claudia y Rolo para recados — personal, trabajo, repairs.

**Flujo:** Cualquiera de los dos captura en su vista → aparece en el feed del otro en tiempo real → quien recibe marca "recibido ✓" / "hecho ✓✓" → el remitente ve el estado actualizado.

## Stack
- Next.js 14 (App Router) + TypeScript
- Supabase (tabla `cosas_de_cosas` en proyecto `pwsrjmhmxqfxmcadhjtz`, compartido con Castle Ops)
- PWA instalable (manifest + SW network-first per RDE Cloud v1 Apéndice PWA)
- Deploy: Vercel → `cosas.castlesolutions.mx`

## Usuarios
- `/claudia` — PIN `1111`
- `/rolo` — PIN `2222`

Ambas vistas son **idénticas** — mismo feed, mismo composer, mismos filtros. Solo cambia quién es el "yo" (lo que determina burbuja izquierda vs derecha, y qué acciones puedes hacer en cada mensaje).

## Mensajes (burbujas)
- **Izquierda** (`.in`): mensajes que TE mandaron → puedes marcar Recibido/Hecho/Deshacer
- **Derecha** (`.out`, verde): mensajes que MANDASTE → puedes cancelar si aún pendiente

## Categorías
- **Personal** (violeta)
- **Trabajo** (ámbar)
- **Repairs** (rosa)

## Estados
`pendiente` → `recibido` → `hecho` | `cancelado`

## Schema Supabase (v2 two-way)

```sql
CREATE TABLE IF NOT EXISTS cosas_de_cosas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  categoria TEXT CHECK (categoria IN ('personal','trabajo','repairs')),
  hora_sugerida TIMESTAMPTZ,
  notas TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','recibido','hecho','cancelado')),
  from_user TEXT NOT NULL CHECK (from_user IN ('claudia','rolo')),
  to_user   TEXT NOT NULL CHECK (to_user   IN ('claudia','rolo')),
  created_by TEXT, -- legacy, kept for compatibility
  created_at TIMESTAMPTZ DEFAULT NOW(),
  recibido_at TIMESTAMPTZ,
  hecho_at TIMESTAMPTZ,
  CONSTRAINT cdc_not_self CHECK (from_user <> to_user)
);
CREATE INDEX IF NOT EXISTS idx_cosas_to_estado ON cosas_de_cosas(to_user, estado, created_at DESC);
ALTER TABLE cosas_de_cosas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all" ON cosas_de_cosas FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE cosas_de_cosas;
```

## Env vars
```
NEXT_PUBLIC_SUPABASE_URL=https://pwsrjmhmxqfxmcadhjtz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon JWT>
```

## Arquitectura componentes
- `lib/supabase.ts` — cliente + tipos
- `components/PinGate.tsx` — login por PIN
- `components/ChatApp.tsx` — la app (single file, reutilizado para ambos usuarios)
- `app/claudia/page.tsx` y `app/rolo/page.tsx` — wrappers triviales

Hecho por Colmena 2026
