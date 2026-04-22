import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SB_URL, SB_KEY);

/**
 * POST body: { user_id, subscription, user_agent? }
 * subscription = objeto nativo del browser devuelto por pushManager.subscribe()
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { user_id, subscription, user_agent } = body;

  if (!user_id || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }

  if (user_id !== 'claudia' && user_id !== 'rolo') {
    return NextResponse.json({ error: 'invalid user' }, { status: 400 });
  }

  // Upsert por endpoint
  const { error } = await supabase
    .from('cdc_push_subscriptions')
    .upsert(
      {
        user_id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: user_agent || null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

  if (error) {
    console.error('subscribe error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const endpoint = body.endpoint;
  if (!endpoint) return NextResponse.json({ error: 'missing endpoint' }, { status: 400 });
  await supabase.from('cdc_push_subscriptions').delete().eq('endpoint', endpoint);
  return NextResponse.json({ ok: true });
}
