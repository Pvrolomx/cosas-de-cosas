# Cosas de Cosas v3

Los pendientes de Claudia y Rolo, ordenados y visibles.

**Modelo:** Sistema de tickets (inspirado en Castle Ops, adaptado a vida personal).

## Características

- **Tickets con estructura**: título, descripción, categoría, urgencia, destinatario, asignado
- **Estados**: `nuevo` → `en_progreso` → `esperando` → `resuelto` | `cancelado`
- **Timeline por ticket**: cada actualización queda registrada con autor, mensaje, cambio de estado
- **Dashboard inteligente**: hero con contador de pendientes, stats rápidas, filtros
- **Bidireccional**: cualquiera manda a cualquiera, o se asigna cosas a sí mismo
- **Visual**: terracota mexicana + crema, tipografía editorial (Fraunces + DM Sans)
- **PWA**: instalable, network-first SW

## Stack

- Next.js 14 App Router + TypeScript
- Supabase (`pwsrjmhmxqfxmcadhjtz` — compartido con Castle Ops; tablas `cdc_tickets` + `cdc_updates`)
- Vercel: `cosas.castlesolutions.mx`

## Categorías

- **Personal** (terracota `#c27363`) — citas, cuerpo, casa, familia
- **Trabajo** (mostaza `#b89346`) — pendientes profesionales
- **Repairs** (verde salvia `#6b8160`) — arreglos, compras, mantenimiento

## Rutas

- `/` — landing (elegir identidad)
- `/yo?me=claudia` o `/yo?me=rolo` — dashboard (PIN 1111 / 2222)
- `/t/new` — formulario nuevo ticket
- `/t/[id]` — detalle con timeline + composer de updates

## Schema

```sql
CREATE TABLE cdc_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT NOT NULL CHECK (categoria IN ('personal','trabajo','repairs')),
  urgencia TEXT NOT NULL DEFAULT 'normal' CHECK (urgencia IN ('baja','normal','alta','urgente')),
  estado TEXT NOT NULL DEFAULT 'nuevo' CHECK (estado IN ('nuevo','en_progreso','esperando','resuelto','cancelado')),
  from_user TEXT NOT NULL CHECK (from_user IN ('claudia','rolo')),
  to_user TEXT NOT NULL CHECK (to_user IN ('claudia','rolo')),
  asignado_a TEXT CHECK (asignado_a IN ('claudia','rolo')),
  fecha_limite TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resuelto_at TIMESTAMPTZ
);

CREATE TABLE cdc_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES cdc_tickets(id) ON DELETE CASCADE,
  autor TEXT NOT NULL CHECK (autor IN ('claudia','rolo')),
  mensaje TEXT NOT NULL,
  estado_cambio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Hecho por Colmena · 2026
