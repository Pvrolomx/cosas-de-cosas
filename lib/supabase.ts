import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key, {
  realtime: { params: { eventsPerSecond: 10 } },
});

export type User = 'claudia' | 'rolo';
export type Categoria = 'personal' | 'trabajo' | 'repairs';
export type Estado = 'pendiente' | 'recibido' | 'hecho' | 'cancelado';

export type Cosa = {
  id: string;
  titulo: string;
  categoria: Categoria;
  hora_sugerida: string | null;
  notas: string | null;
  estado: Estado;
  from_user: User;
  to_user: User;
  created_at: string;
  recibido_at: string | null;
  hecho_at: string | null;
};

export const otroUser = (u: User): User => (u === 'claudia' ? 'rolo' : 'claudia');
export const labelUser = (u: User): string => (u === 'claudia' ? 'Claudia' : 'Rolo');
