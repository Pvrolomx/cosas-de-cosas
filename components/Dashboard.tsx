'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, Ticket, User, Categoria, Estado, Urgencia, labelUser, labelCategoria, labelEstado } from '@/lib/supabase';
import PushBell from './PushBell';

type Filter = 'todos' | 'mios' | 'para_mi' | 'urgentes' | 'resueltos';

export default function Dashboard({ me }: { me: User }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('para_mi');
  const [catFilter, setCatFilter] = useState<'all' | Categoria>('all');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const router = useRouter();

  const load = async () => {
    const { data } = await supabase
      .from('cdc_tickets')
      .select('*')
      .order('urgencia', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(300);
    setTickets((data as Ticket[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`cdc-dash-${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cdc_tickets' }, (payload) => {
        load();
        if (payload.eventType === 'INSERT' && (payload.new as any)?.to_user === me) {
          if (navigator.vibrate) navigator.vibrate(120);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cdc_updates' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me]);

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

  const logout = () => {
    localStorage.removeItem(`cdc_${me}`);
    location.href = '/';
  };

  const stats = useMemo(() => {
    const activos = tickets.filter(t => t.estado !== 'resuelto' && t.estado !== 'cancelado');
    return {
      paraMi: activos.filter(t => t.to_user === me || t.asignado_a === me).length,
      urgentes: activos.filter(t => t.urgencia === 'urgente').length,
      enProgreso: activos.filter(t => t.estado === 'en_progreso').length,
    };
  }, [tickets, me]);

  const visibles = useMemo(() => {
    return tickets.filter(t => {
      // Filtro principal
      if (filter === 'mios' && t.from_user !== me) return false;
      if (filter === 'para_mi' && t.to_user !== me && t.asignado_a !== me) return false;
      if (filter === 'urgentes' && t.urgencia !== 'urgente') return false;
      if (filter === 'resueltos' && t.estado !== 'resuelto') return false;
      if (filter !== 'resueltos' && t.estado === 'resuelto') return false;
      if (t.estado === 'cancelado' && filter !== 'todos') return false;
      // Filtro categoría
      if (catFilter !== 'all' && t.categoria !== catFilter) return false;
      return true;
    });
  }, [tickets, filter, catFilter, me]);

  // Agrupar por urgencia para headers de sección
  const grupos = useMemo(() => {
    const urgentes = visibles.filter(t => t.urgencia === 'urgente');
    const altas = visibles.filter(t => t.urgencia === 'alta');
    const resto = visibles.filter(t => t.urgencia !== 'urgente' && t.urgencia !== 'alta');
    return { urgentes, altas, resto };
  }, [visibles]);

  const saludo = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <>
      {installPrompt && (
        <button className="install-btn" onClick={install}>Instalar</button>
      )}
      <div className="shell">
        <div className="topbar">
          <div className="brand">Cosas <em>de</em> cosas</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PushBell me={me} />
            <button className="whoami" onClick={logout}>{labelUser(me)} · salir</button>
          </div>
        </div>

        {/* HERO */}
        <div className="hero">
          <div className="eyebrow">{saludo()}, {labelUser(me).toLowerCase()}</div>
          <h1>
            {stats.paraMi === 0 ? (
              <>Todo <em>tranquilo</em></>
            ) : stats.urgentes > 0 ? (
              <>Hay <em>{stats.urgentes}</em> urgente{stats.urgentes !== 1 && 's'}</>
            ) : (
              <><em>{stats.paraMi}</em> cosa{stats.paraMi !== 1 && 's'} para ti</>
            )}
          </h1>
          <div className="subtitle">
            {stats.paraMi === 0
              ? 'No hay pendientes para ti ahora.'
              : stats.urgentes > 0
              ? 'Empieza por lo rojo. Lo demás puede esperar.'
              : 'Revísalas cuando puedas, no hay prisa.'}
          </div>
          <div className="stats">
            <div className={`stat ${filter === 'para_mi' ? 'active' : ''}`} onClick={() => setFilter('para_mi')}>
              <div className="stat-label">Para ti</div>
              <div className="stat-value">{stats.paraMi}</div>
            </div>
            <div className={`stat ${filter === 'urgentes' ? 'urgent-active' : ''}`} onClick={() => setFilter('urgentes')}>
              <div className="stat-label">Urgentes</div>
              <div className="stat-value">{stats.urgentes}</div>
            </div>
            <div className="stat" onClick={() => setFilter('mios')}>
              <div className="stat-label">Enviados</div>
              <div className="stat-value">{tickets.filter(t => t.from_user === me && t.estado !== 'resuelto' && t.estado !== 'cancelado').length}</div>
            </div>
          </div>
        </div>

        {/* FILTROS */}
        <div className="filter-bar">
          <button className={`pill ${filter === 'para_mi' ? 'active' : ''}`} onClick={() => setFilter('para_mi')}>Para mí</button>
          <button className={`pill ${filter === 'mios' ? 'active' : ''}`} onClick={() => setFilter('mios')}>Enviados</button>
          <button className={`pill ${filter === 'todos' ? 'active' : ''}`} onClick={() => setFilter('todos')}>Todos</button>
          <button className={`pill ${filter === 'urgentes' ? 'active' : ''}`} onClick={() => setFilter('urgentes')}>Urgentes</button>
          <button className={`pill ${filter === 'resueltos' ? 'active' : ''}`} onClick={() => setFilter('resueltos')}>Resueltos</button>
        </div>
        <div className="filter-bar">
          <button className={`pill ${catFilter === 'all' ? 'active' : ''}`} onClick={() => setCatFilter('all')}>Todas</button>
          <button className={`pill personal ${catFilter === 'personal' ? 'active' : ''}`} onClick={() => setCatFilter('personal')}>Personal</button>
          <button className={`pill trabajo ${catFilter === 'trabajo' ? 'active' : ''}`} onClick={() => setCatFilter('trabajo')}>Trabajo</button>
          <button className={`pill repairs ${catFilter === 'repairs' ? 'active' : ''}`} onClick={() => setCatFilter('repairs')}>Repairs</button>
        </div>

        {/* LISTA */}
        {loading ? (
          <div className="empty"><div className="msg">Leyendo…</div></div>
        ) : visibles.length === 0 ? (
          <div className="empty">
            <div className="emoji">∅</div>
            <div className="msg">Nada por aquí</div>
            <div className="sub">Crea algo con el botón de abajo.</div>
          </div>
        ) : (
          <>
            {grupos.urgentes.length > 0 && <div className="section-label">Urgente</div>}
            {grupos.urgentes.map(t => <TicketCard key={t.id} ticket={t} me={me} />)}
            {grupos.altas.length > 0 && <div className="section-label">Alta prioridad</div>}
            {grupos.altas.map(t => <TicketCard key={t.id} ticket={t} me={me} />)}
            {grupos.resto.length > 0 && (grupos.urgentes.length > 0 || grupos.altas.length > 0) && (
              <div className="section-label">Lo demás</div>
            )}
            {grupos.resto.map(t => <TicketCard key={t.id} ticket={t} me={me} />)}
          </>
        )}

        <div className="footer">Hecho por Colmena · 2026</div>
      </div>

      <Link href="/t/new" className="fab">
        <span className="plus">+</span>
        <span>Nueva cosa</span>
      </Link>
    </>
  );
}

function TicketCard({ ticket, me }: { ticket: Ticket; me: User }) {
  const router = useRouter();
  const fecha = new Date(ticket.created_at).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  return (
    <div
      className={`ticket cat-${ticket.categoria} ${ticket.estado} ${ticket.urgencia === 'urgente' ? 'urgente' : ''}`}
      onClick={() => router.push(`/t/${ticket.id}`)}
    >
      <div className="t-head">
        <span className={`t-tag ${ticket.categoria}`}>{labelCategoria[ticket.categoria]}</span>
        {ticket.urgencia === 'urgente' && <span className="t-urgente">Urgente</span>}
        {ticket.urgencia === 'alta' && (
          <span style={{ fontSize: 11, color: 'var(--trabajo-deep)', fontWeight: 600, letterSpacing: '0.05em' }}>ALTA</span>
        )}
      </div>
      <h3 className="t-title">{ticket.titulo}</h3>
      {ticket.descripcion && <p className="t-desc">{ticket.descripcion}</p>}
      <div className="t-meta">
        <span className={`t-estado ${ticket.estado}`}>
          <span className="estado-dot"></span>
          {labelEstado[ticket.estado]}
        </span>
        <span className="dot"></span>
        <span className="t-direction">
          <strong>{labelUser(ticket.from_user)}</strong>
          <span className="arrow">→</span>
          <strong>{labelUser(ticket.to_user)}</strong>
        </span>
        <span className="dot"></span>
        <span>{fecha}</span>
      </div>
    </div>
  );
}
