import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:noreply@castlesolutions.mx';
const WEBHOOK_SECRET = process.env.PUSH_WEBHOOK_SECRET!;
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supabase = createClient(SB_URL, SB_KEY);

/**
 * Este endpoint recibe el database webhook de Supabase cuando se inserta
 * una nueva fila en cdc_tickets. Payload típico:
 * {
 *   "type": "INSERT",
 *   "table": "cdc_tickets",
 *   "record": { id, titulo, from_user, to_user, ... },
 *   "schema": "public"
 * }
 *
 * Autenticación: header `x-webhook-secret` debe coincidir con PUSH_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  // Auth
  const secret = req.headers.get('x-webhook-secret');
  if (secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  // Solo inserts en cdc_tickets nos interesan
  if (body.type !== 'INSERT' || body.table !== 'cdc_tickets') {
    return NextResponse.json({ ok: true, skipped: 'not an INSERT on cdc_tickets' });
  }

  const ticket = body.record;
  if (!ticket?.to_user || !ticket?.id) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }

  // No notificarle a alguien sobre un ticket que él mismo creó
  if (ticket.from_user === ticket.to_user) {
    return NextResponse.json({ ok: true, skipped: 'self-ticket' });
  }

  // Buscar suscripciones del destinatario
  const { data: subs, error } = await supabase
    .from('cdc_push_subscriptions')
    .select('*')
    .eq('user_id', ticket.to_user);

  if (error) {
    console.error('Error loading subs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, skipped: 'no subscriptions', user: ticket.to_user });
  }

  const fromLabel = ticket.from_user === 'claudia' ? 'Claudia' : 'Rolo';
  const categoria = ticket.categoria || '';
  const urgencia = ticket.urgencia || 'normal';

  const payload = JSON.stringify({
    title: `Nuevo de ${fromLabel}${urgencia === 'urgente' ? ' · URGENTE' : ''}`,
    body: ticket.titulo,
    url: `/t/${ticket.id}`,
    tag: `ticket-${ticket.id}`,
    categoria,
    urgencia,
  });

  const results = await Promise.allSettled(
    subs.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
          { TTL: 3600 }
        );
        // Actualizar last_used_at
        await supabase
          .from('cdc_push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('endpoint', sub.endpoint);
        return { endpoint: sub.endpoint.slice(-16), ok: true };
      } catch (err: any) {
        const status = err.statusCode || 0;
        // 404 y 410: endpoint muerto, borrar
        if (status === 404 || status === 410) {
          await supabase
            .from('cdc_push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
          return { endpoint: sub.endpoint.slice(-16), ok: false, removed: true, status };
        }
        return { endpoint: sub.endpoint.slice(-16), ok: false, status, err: err.message };
      }
    })
  );

  return NextResponse.json({
    ok: true,
    sent: results.length,
    results: results.map((r) => r.status === 'fulfilled' ? r.value : { ok: false, rejected: true }),
  });
}

// Healthcheck
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'cosas-de-cosas push',
    vapid_public_set: !!VAPID_PUBLIC,
    vapid_private_set: !!VAPID_PRIVATE,
    webhook_secret_set: !!WEBHOOK_SECRET,
  });
}
