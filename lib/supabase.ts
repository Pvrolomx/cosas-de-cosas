import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key, {
  realtime: { params: { eventsPerSecond: 10 } },
});

export type Cosa = {
  id: string;
  titulo: string;
  categoria: 'personal' | 'trabajo' | 'repairs';
  hora_sugerida: string | null;
  notas: string | null;
  estado: 'pendiente' | 'recibido' | 'hecho' | 'cancelado';
  created_by: string | null;
  created_at: string;
  recibido_at: string | null;
  hecho_at: string | null;
};
