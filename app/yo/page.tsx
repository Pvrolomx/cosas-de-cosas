'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PinGate from '@/components/PinGate';
import { User } from '@/lib/supabase';

function YoContent() {
  const params = useSearchParams();
  const me = (params.get('me') as User) || 'claudia';
  if (me !== 'claudia' && me !== 'rolo') {
    return <div style={{ padding: 40, textAlign: 'center' }}>Identidad inválida. <a href="/">Volver</a></div>;
  }
  return <PinGate me={me} />;
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Cargando…</div>}>
      <YoContent />
    </Suspense>
  );
}
