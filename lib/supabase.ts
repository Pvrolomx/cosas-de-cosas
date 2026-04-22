import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key, {
  realtime: { params: { eventsPerSecond: 10 } },
});

export type User = 'claudia' | 'rolo';
export type Categoria = 'personal' | 'trabajo' | 'repairs';
export type Urgencia = 'baja' | 'normal' | 'alta' | 'urgente';
export type Estado = 'nuevo' | 'en_progreso' | 'esperando' | 'resuelto' | 'cancelado';

export type Ticket = {
  id: string;
  titulo: string;
  descripcion: string | null;
  categoria: Categoria;
  urgencia: Urgencia;
  estado: Estado;
  from_user: User;
  to_user: User;
  asignado_a: User | null;  // quién se encarga (puede cambiar)
  fecha_limite: string | null;
  created_at: string;
  updated_at: string;
  resuelto_at: string | null;
};

export type TicketUpdate = {
  id: string;
  ticket_id: string;
  autor: User;
  mensaje: string;
  estado_cambio: Estado | null;
  created_at: string;
};

// ============= LABELS Y VISUALES =============

export const labelUser = (u: User | null): string => {
  if (!u) return '—';
  return u === 'claudia' ? 'Claudia' : 'Rolo';
};

export const otroUser = (u: User): User => (u === 'claudia' ? 'rolo' : 'claudia');

export const labelCategoria: Record<Categoria, string> = {
  personal: 'Personal',
  trabajo: 'Trabajo',
  repairs: 'Repairs',
};

export const labelEstado: Record<Estado, string> = {
  nuevo: 'Nuevo',
  en_progreso: 'En progreso',
  esperando: 'Esperando',
  resuelto: 'Resuelto',
  cancelado: 'Cancelado',
};

export const labelUrgencia: Record<Urgencia, string> = {
  baja: 'Baja',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};

// Iconos SVG inline (no dependencias) — estilo "hand-drawn" ligero
export const iconCategoria: Record<Categoria, string> = {
  personal: '◔',   // círculo parcial
  trabajo: '◈',    // rombo con punto
  repairs: '⬢',    // hexágono
};

export const descCategoria: Record<Categoria, string> = {
  personal: 'Citas, cuerpo, casa, familia',
  trabajo: 'Pendientes profesionales',
  repairs: 'Arreglos, compras, mantenimiento',
};
