'use client';
import { useEffect, useState } from 'react';
import { User } from '@/lib/supabase';
import { checkPushState, enablePush, disablePush, isIOS, isIOSPWAInstalled, PushState } from '@/lib/push';

export default function PushBell({ me }: { me: User }) {
  const [state, setState] = useState<PushState>('unsupported');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    checkPushState().then(setState);
  }, []);

  const onEnable = async () => {
    setLoading(true);
    setMsg('');
    const r = await enablePush(me);
    if (r.ok) {
      setState('granted-subscribed');
      setMsg('✓ Avisos activados');
      setTimeout(() => setMsg(''), 3000);
    } else {
      setMsg(r.error || 'No se pudo activar');
    }
    setLoading(false);
  };

  const onDisable = async () => {
    if (!confirm('¿Desactivar los avisos push?')) return;
    setLoading(true);
    const r = await disablePush();
    if (r.ok) {
      const s = await checkPushState();
      setState(s);
      setMsg('Avisos desactivados');
      setTimeout(() => setMsg(''), 3000);
    }
    setLoading(false);
  };

  // iOS requiere PWA instalada desde Safari. Si es iOS y no está instalada, mostrar ayuda.
  const iosNotInstalled = isIOS() && !isIOSPWAInstalled();

  if (state === 'unsupported' && !iosNotInstalled) return null;

  return (
    <>
      <div className="push-bell">
        {state === 'granted-subscribed' && (
          <button className="bell active" onClick={onDisable} disabled={loading} title="Avisos activos">
            <BellIcon filled />
            <span>Avisos</span>
          </button>
        )}
        {(state === 'default' || state === 'granted-unsubscribed') && !iosNotInstalled && (
          <button className="bell" onClick={onEnable} disabled={loading}>
            <BellIcon />
            <span>{loading ? 'Activando…' : 'Activar avisos'}</span>
          </button>
        )}
        {state === 'denied' && (
          <button className="bell denied" onClick={() => setShowHelp(true)}>
            <BellIcon muted />
            <span>Avisos bloqueados</span>
          </button>
        )}
        {iosNotInstalled && (
          <button className="bell ios-hint" onClick={() => setShowHelp(true)}>
            <BellIcon />
            <span>Cómo recibir avisos</span>
          </button>
        )}
        {msg && <span className="bell-msg">{msg}</span>}
      </div>

      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {iosNotInstalled ? (
              <>
                <h3>Instalar en iPhone</h3>
                <ol>
                  <li>Asegúrate de estar en <strong>Safari</strong> (no Chrome).</li>
                  <li>Toca el botón <strong>Compartir</strong> (cuadrado con flecha hacia arriba).</li>
                  <li>Elige <strong>«Añadir a pantalla de inicio»</strong>.</li>
                  <li>Abre la app desde el ícono que aparece en tu pantalla.</li>
                  <li>Ya adentro, vuelve a tocar <em>Activar avisos</em>.</li>
                </ol>
                <p className="hint">Desde navegador web normal, iOS no permite notificaciones.</p>
              </>
            ) : (
              <>
                <h3>Avisos bloqueados</h3>
                <p>Los avisos fueron bloqueados para este sitio. Para volver a activarlos:</p>
                <ol>
                  <li>Toca el candado 🔒 (o ícono «aA») en la barra del navegador.</li>
                  <li>Busca <strong>Notificaciones</strong>.</li>
                  <li>Cambia a <strong>Permitir</strong>.</li>
                  <li>Recarga la página y vuelve a tocar <em>Activar avisos</em>.</li>
                </ol>
              </>
            )}
            <button className="btn" onClick={() => setShowHelp(false)}>Entendido</button>
          </div>
        </div>
      )}
    </>
  );
}

function BellIcon({ filled = false, muted = false }: { filled?: boolean; muted?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: muted ? 0.5 : 1 }}>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" fill={filled ? 'currentColor' : 'none'} />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}
