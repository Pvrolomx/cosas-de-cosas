'use client';
import { useEffect, useState } from 'react';
import { supabase, Cosa } from '@/lib/supabase';

const PIN_ROLO = '2222';

export default function RoloPage() {
  const [auth, setAuth] = useState(false);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('cdc_rolo') === '1') {
      setAuth(true);
    }
  }, []);

  const tryPin = () => {
    if (pin === PIN_ROLO) {
      localStorage.setItem('cdc_rolo', '1');
      setAuth(true);
    } else {
      setErr('PIN incorrecto');
      setPin('');
    }
  };

  if (!auth) {
    return (
      <div className="pin-screen">
        <div className="pin-box">
          <h1>Cosas de Cosas</h1>
          <p>Rolo — PIN</p>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setErr(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') tryPin(); }}
            autoFocus
          />
          <div className="err">{err}</div>
          <button onClick={tryPin}>Entrar</button>
        </div>
      </div>
    );
  }

  return <RoloApp />;
}

function RoloApp() {
  const [items, setItems] = useState<Cosa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pendientes' | 'activos' | 'todos'>('pendientes');
  const [catFilter, setCatFilter] = useState<'all' | 'personal' | 'trabajo' | 'repairs'>('all');
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const load = async () => {
    const { data } = await supabase
      .from('cosas_de_cosas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(80);
    setItems((data as Cosa[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel('cdc-rolo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cosas_de_cosas' }, (payload) => {
        load();
        // Sonido leve al llegar nuevo pendiente
        if (payload.eventType === 'INSERT') {
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch {}
          // Vibrar si disponible
          if (navigator.vibrate) navigator.vibrate(150);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    const h = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const marcarRecibido = async (id: string) => {
    await supabase.from('cosas_de_cosas').update({
      estado: 'recibido', recibido_at: new Date().toISOString()
    }).eq('id', id);
  };
  const marcarHecho = async (id: string) => {
    await supabase.from('cosas_de_cosas').update({
      estado: 'hecho', hecho_at: new Date().toISOString()
    }).eq('id', id);
  };
  const deshacer = async (id: string) => {
    await supabase.from('cosas_de_cosas').update({
      estado: 'pendiente', recibido_at: null, hecho_at: null
    }).eq('id', id);
  };

  const logout = () => {
    localStorage.removeItem('cdc_rolo');
    location.href = '/';
  };

  const visibles = items.filter((i) => {
    const estadoOk =
      filter === 'pendientes' ? i.estado === 'pendiente' :
      filter === 'activos'    ? i.estado === 'pendiente' || i.estado === 'recibido' :
      true;
    const catOk = catFilter === 'all' || i.categoria === catFilter;
    return estadoOk && catOk;
  });

  const pendientesCount = items.filter((i) => i.estado === 'pendiente').length;

  return (
    <>
      {installPrompt && (
        <button className="install-btn" onClick={install}>Instalar App</button>
      )}
      <div className="container">
        <div className="header">
          <h1>Cosas de Cosas {pendientesCount > 0 && <span style={{ color: 'var(--accent)' }}>({pendientesCount})</span>}</h1>
          <span className="who" onClick={logout} style={{ cursor: 'pointer' }}>Rolo · salir</span>
        </div>

        <div className="filter-row">
          <button className={`toggle-estado ${filter === 'pendientes' ? 'active' : ''}`} onClick={() => setFilter('pendientes')}>Pendientes</button>
          <button className={`toggle-estado ${filter === 'activos' ? 'active' : ''}`} onClick={() => setFilter('activos')}>Activos</button>
          <button className={`toggle-estado ${filter === 'todos' ? 'active' : ''}`} onClick={() => setFilter('todos')}>Todos</button>
        </div>

        <div className="filter-row">
          <button className={`toggle-estado ${catFilter === 'all' ? 'active' : ''}`} onClick={() => setCatFilter('all')}>Todas</button>
          <button className={`toggle-estado ${catFilter === 'personal' ? 'active' : ''}`} onClick={() => setCatFilter('personal')}>Personal</button>
          <button className={`toggle-estado ${catFilter === 'trabajo' ? 'active' : ''}`} onClick={() => setCatFilter('trabajo')}>Trabajo</button>
          <button className={`toggle-estado ${catFilter === 'repairs' ? 'active' : ''}`} onClick={() => setCatFilter('repairs')}>Repairs</button>
        </div>

        {loading ? (
          <div className="empty"><div className="emoji">⏳</div>Cargando...</div>
        ) : visibles.length === 0 ? (
          <div className="empty">
            <div className="emoji">🎉</div>
            Sin {filter === 'pendientes' ? 'pendientes' : 'cosas'}.
          </div>
        ) : (
          visibles.map((i) => (
            <div key={i.id} className={`card ${i.estado}`}>
              <div className="top">
                <div>
                  <div className="titulo">{i.titulo}</div>
                  {i.notas && <div className="notas">{i.notas}</div>}
                </div>
                <div className={`cat-dot ${i.categoria}`} title={i.categoria} />
              </div>
              <div className="meta">
                <span>
                  {new Date(i.created_at).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                  {' · '}{i.categoria}
                </span>
                <span className={`checks ${i.estado !== 'pendiente' ? 'doble' : ''}`}>
                  {i.estado === 'pendiente' && '✓ nuevo'}
                  {i.estado === 'recibido' && '✓✓ recibido'}
                  {i.estado === 'hecho' && '✓✓ hecho'}
                  {i.estado === 'cancelado' && '✗ cancelado'}
                </span>
              </div>
              <div className="card-actions">
                {i.estado === 'pendiente' && (
                  <>
                    <button className="primary" onClick={() => marcarRecibido(i.id)}>Recibido ✓</button>
                    <button onClick={() => marcarHecho(i.id)}>Hecho ✓✓</button>
                  </>
                )}
                {i.estado === 'recibido' && (
                  <>
                    <button className="primary" onClick={() => marcarHecho(i.id)}>Hecho ✓✓</button>
                    <button onClick={() => deshacer(i.id)}>Deshacer</button>
                  </>
                )}
                {(i.estado === 'hecho' || i.estado === 'cancelado') && (
                  <button onClick={() => deshacer(i.id)}>Reactivar</button>
                )}
              </div>
            </div>
          ))
        )}
        <div className="footer">Hecho por Colmena 2026</div>
      </div>
    </>
  );
}
