'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase, Cosa } from '@/lib/supabase';

const PIN_CLAUDIA = '1111';
type Categoria = 'personal' | 'trabajo' | 'repairs';

export default function ClaudiaPage() {
  const [auth, setAuth] = useState(false);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('cdc_claudia') === '1') {
      setAuth(true);
    }
  }, []);

  const tryPin = () => {
    if (pin === PIN_CLAUDIA) {
      localStorage.setItem('cdc_claudia', '1');
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
          <p>Claudia — PIN</p>
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

  return <ClaudiaApp />;
}

function ClaudiaApp() {
  const [categoria, setCategoria] = useState<Categoria>('personal');
  const [titulo, setTitulo] = useState('');
  const [items, setItems] = useState<Cosa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'activos' | 'todos'>('activos');
  const taRef = useRef<HTMLTextAreaElement>(null);
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
      .channel('cdc-claudia')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cosas_de_cosas' }, () => load())
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

  const send = async () => {
    const t = titulo.trim();
    if (!t) return;
    const body = { titulo: t, categoria, created_by: 'claudia' };
    setTitulo('');
    if (taRef.current) taRef.current.style.height = '44px';
    const { error } = await supabase.from('cosas_de_cosas').insert(body);
    if (error) {
      alert('Error al guardar: ' + error.message);
      setTitulo(t);
    }
  };

  const cancelar = async (id: string) => {
    if (!confirm('¿Cancelar este recado?')) return;
    await supabase.from('cosas_de_cosas').update({ estado: 'cancelado' }).eq('id', id);
  };

  const logout = () => {
    localStorage.removeItem('cdc_claudia');
    location.href = '/';
  };

  const visibles = items.filter((i) =>
    filter === 'activos' ? i.estado === 'pendiente' || i.estado === 'recibido' : true
  );

  const onTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitulo(e.target.value);
    const ta = e.target;
    ta.style.height = '44px';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  };

  return (
    <>
      {installPrompt && (
        <button className="install-btn" onClick={install}>Instalar App</button>
      )}
      <div className="container">
        <div className="header">
          <h1>Cosas de Cosas</h1>
          <span className="who" onClick={logout} style={{ cursor: 'pointer' }}>Claudia ·  salir</span>
        </div>

        <div className="filter-row">
          <button
            className={`toggle-estado ${filter === 'activos' ? 'active' : ''}`}
            onClick={() => setFilter('activos')}
          >Activos</button>
          <button
            className={`toggle-estado ${filter === 'todos' ? 'active' : ''}`}
            onClick={() => setFilter('todos')}
          >Todos</button>
        </div>

        {loading ? (
          <div className="empty"><div className="emoji">⏳</div>Cargando...</div>
        ) : visibles.length === 0 ? (
          <div className="empty">
            <div className="emoji">✨</div>
            Sin recados activos. Escribe uno abajo.
          </div>
        ) : (
          visibles.map((i) => (
            <div key={i.id} className={`card ${i.estado}`}>
              <div className="top">
                <div>
                  <div className="titulo">{i.titulo}</div>
                  {i.notas && <div className="notas">{i.notas}</div>}
                </div>
                <div className={`cat-dot ${i.categoria}`} />
              </div>
              <div className="meta">
                <span>{new Date(i.created_at).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
                <span className={`checks ${i.estado !== 'pendiente' ? 'doble' : ''}`}>
                  {i.estado === 'pendiente' && '✓'}
                  {i.estado === 'recibido' && '✓✓'}
                  {i.estado === 'hecho' && '✓✓ hecho'}
                  {i.estado === 'cancelado' && '✗ cancelado'}
                </span>
              </div>
              {i.estado === 'pendiente' && (
                <div className="card-actions">
                  <button className="danger" onClick={() => cancelar(i.id)}>Cancelar</button>
                </div>
              )}
            </div>
          ))
        )}
        <div className="footer">Hecho por Colmena 2026</div>
      </div>

      <div className="composer">
        <div className="composer-inner">
          <div className="chip-row">
            <button
              className={`chip ${categoria === 'personal' ? 'active-personal' : ''}`}
              onClick={() => setCategoria('personal')}
            >Personal</button>
            <button
              className={`chip ${categoria === 'trabajo' ? 'active-trabajo' : ''}`}
              onClick={() => setCategoria('trabajo')}
            >Trabajo</button>
            <button
              className={`chip ${categoria === 'repairs' ? 'active-repairs' : ''}`}
              onClick={() => setCategoria('repairs')}
            >Repairs</button>
          </div>
          <div className="composer-row">
            <textarea
              ref={taRef}
              placeholder="¿Qué necesitas?"
              value={titulo}
              onChange={onTextareaInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button className="send" onClick={send} disabled={!titulo.trim()}>→</button>
          </div>
        </div>
      </div>
    </>
  );
}
