'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase, Cosa, User, Categoria, otroUser, labelUser } from '@/lib/supabase';

type Props = { me: User };

export default function ChatApp({ me }: Props) {
  const other = otroUser(me);
  const [categoria, setCategoria] = useState<Categoria>('personal');
  const [titulo, setTitulo] = useState('');
  const [items, setItems] = useState<Cosa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'activos' | 'todos'>('activos');
  const [catFilter, setCatFilter] = useState<'all' | Categoria>('all');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from('cosas_de_cosas')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200);
    setItems((data as Cosa[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`cdc-${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cosas_de_cosas' }, (payload) => {
        load();
        // Alert solo si el nuevo item es PARA mí (incoming)
        if (payload.eventType === 'INSERT' && (payload.new as any)?.to_user === me) {
          if (navigator.vibrate) navigator.vibrate(150);
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch {}
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me]);

  // Auto-scroll al final cuando llegan items nuevos
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [items.length]);

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
    const body = { titulo: t, categoria, from_user: me, to_user: other };
    setTitulo('');
    if (taRef.current) taRef.current.style.height = '44px';
    const { error } = await supabase.from('cosas_de_cosas').insert(body);
    if (error) {
      alert('Error al guardar: ' + error.message);
      setTitulo(t);
    }
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
  const cancelar = async (id: string) => {
    if (!confirm('¿Cancelar este recado?')) return;
    await supabase.from('cosas_de_cosas').update({ estado: 'cancelado' }).eq('id', id);
  };

  const logout = () => {
    localStorage.removeItem(`cdc_${me}`);
    location.href = '/';
  };

  const visibles = items.filter((i) => {
    const estadoOk = filter === 'activos'
      ? (i.estado === 'pendiente' || i.estado === 'recibido')
      : true;
    const catOk = catFilter === 'all' || i.categoria === catFilter;
    return estadoOk && catOk;
  });

  // Count de pendientes PARA mí (incoming no recibidos)
  const pendientesParaMi = items.filter((i) => i.to_user === me && i.estado === 'pendiente').length;

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
          <h1>
            Cosas de Cosas{' '}
            {pendientesParaMi > 0 && (
              <span style={{ color: 'var(--accent)' }}>({pendientesParaMi})</span>
            )}
          </h1>
          <span className="who" onClick={logout} style={{ cursor: 'pointer' }}>
            {labelUser(me)} · salir
          </span>
        </div>

        <div className="filter-row">
          <button className={`toggle-estado ${filter === 'activos' ? 'active' : ''}`} onClick={() => setFilter('activos')}>Activos</button>
          <button className={`toggle-estado ${filter === 'todos' ? 'active' : ''}`} onClick={() => setFilter('todos')}>Todos</button>
        </div>
        <div className="filter-row">
          <button className={`toggle-estado ${catFilter === 'all' ? 'active' : ''}`} onClick={() => setCatFilter('all')}>Todas</button>
          <button className={`toggle-estado ${catFilter === 'personal' ? 'active' : ''}`} onClick={() => setCatFilter('personal')}>Personal</button>
          <button className={`toggle-estado ${catFilter === 'trabajo' ? 'active' : ''}`} onClick={() => setCatFilter('trabajo')}>Trabajo</button>
          <button className={`toggle-estado ${catFilter === 'repairs' ? 'active' : ''}`} onClick={() => setCatFilter('repairs')}>Repairs</button>
        </div>

        <div ref={feedRef} className="feed">
          {loading ? (
            <div className="empty"><div className="emoji">⏳</div>Cargando...</div>
          ) : visibles.length === 0 ? (
            <div className="empty">
              <div className="emoji">✨</div>
              Sin recados. Manda uno abajo.
            </div>
          ) : (
            visibles.map((i) => {
              const outgoing = i.from_user === me; // lo mandé yo
              return (
                <div
                  key={i.id}
                  className={`msg ${outgoing ? 'out' : 'in'} ${i.estado}`}
                >
                  <div className="msg-bubble">
                    <div className="msg-header">
                      <span className={`cat-tag ${i.categoria}`}>{i.categoria}</span>
                      <span className="msg-dir">
                        {outgoing ? `yo → ${labelUser(other)}` : `${labelUser(i.from_user)} → yo`}
                      </span>
                    </div>
                    <div className="msg-text">{i.titulo}</div>
                    {i.notas && <div className="msg-notes">{i.notas}</div>}
                    <div className="msg-meta">
                      <span>
                        {new Date(i.created_at).toLocaleString('es-MX', {
                          hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short',
                        })}
                      </span>
                      <span className={`checks ${i.estado !== 'pendiente' ? 'doble' : ''}`}>
                        {i.estado === 'pendiente' && '✓'}
                        {i.estado === 'recibido' && '✓✓'}
                        {i.estado === 'hecho' && '✓✓ hecho'}
                        {i.estado === 'cancelado' && '✗ cancelado'}
                      </span>
                    </div>
                    {/* Acciones: depende de si es incoming u outgoing */}
                    {!outgoing && i.estado === 'pendiente' && (
                      <div className="msg-actions">
                        <button className="primary" onClick={() => marcarRecibido(i.id)}>Recibido ✓</button>
                        <button onClick={() => marcarHecho(i.id)}>Hecho ✓✓</button>
                      </div>
                    )}
                    {!outgoing && i.estado === 'recibido' && (
                      <div className="msg-actions">
                        <button className="primary" onClick={() => marcarHecho(i.id)}>Hecho ✓✓</button>
                        <button onClick={() => deshacer(i.id)}>Deshacer</button>
                      </div>
                    )}
                    {!outgoing && (i.estado === 'hecho' || i.estado === 'cancelado') && (
                      <div className="msg-actions">
                        <button onClick={() => deshacer(i.id)}>Reactivar</button>
                      </div>
                    )}
                    {outgoing && i.estado === 'pendiente' && (
                      <div className="msg-actions">
                        <button className="danger" onClick={() => cancelar(i.id)}>Cancelar</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="footer">Hecho por Colmena 2026</div>
      </div>

      <div className="composer">
        <div className="composer-inner">
          <div className="chip-row">
            <button className={`chip ${categoria === 'personal' ? 'active-personal' : ''}`} onClick={() => setCategoria('personal')}>Personal</button>
            <button className={`chip ${categoria === 'trabajo' ? 'active-trabajo' : ''}`} onClick={() => setCategoria('trabajo')}>Trabajo</button>
            <button className={`chip ${categoria === 'repairs' ? 'active-repairs' : ''}`} onClick={() => setCategoria('repairs')}>Repairs</button>
          </div>
          <div className="composer-row">
            <textarea
              ref={taRef}
              placeholder={`Para ${labelUser(other)}...`}
              value={titulo}
              onChange={onTextareaInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
              }}
            />
            <button className="send" onClick={send} disabled={!titulo.trim()}>→</button>
          </div>
        </div>
      </div>
    </>
  );
}
