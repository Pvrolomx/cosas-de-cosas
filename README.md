# Cosas de Cosas

Recados de Claudia — personal, trabajo, repairs.

**Flujo:** Claudia captura en su vista → Rolo ve en tiempo real y marca "recibido" → Claudia ve ✓✓ estilo WhatsApp.

## Stack
- Next.js 14 (App Router) + TypeScript
- Supabase (tabla `cosas_de_cosas` en proyecto `pwsrjmhmxqfxmcadhjtz`, compartido con Castle Ops)
- PWA instalable (manifest + service worker network-first per RDE Cloud v1 Apéndice PWA)
- Deploy: Vercel → `cosas.castlesolutions.mx`

## Roles
- `/claudia` — capturista (PIN: `1111`)
- `/rolo` — ejecutor (PIN: `2222`)

## Categorías
- **Personal** (violeta)
- **Trabajo** (ámbar)
- **Repairs** (rosa)

## Estados
`pendiente` → `recibido` → `hecho` | `cancelado`

## Schema Supabase

```sql
CREATE TABLE IF NOT EXISTS cosas_de_cosas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  categoria TEXT CHECK (categoria IN ('personal','trabajo','repairs')),
  hora_sugerida TIMESTAMPTZ,
  notas TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','recibido','hecho','cancelado')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  recibido_at TIMESTAMPTZ,
  hecho_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cosas_estado_created ON cosas_de_cosas(estado, created_at DESC);
ALTER TABLE cosas_de_cosas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all" ON cosas_de_cosas FOR ALL USING (true) WITH CHECK (true);
-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE cosas_de_cosas;
```

## Env vars
```
NEXT_PUBLIC_SUPABASE_URL=https://pwsrjmhmxqfxmcadhjtz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon JWT>
```

Hecho por Colmena 2026
