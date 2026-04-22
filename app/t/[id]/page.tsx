'use client';
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, Ticket, TicketUpdate, User, Estado, Urgencia, labelUser, labelCategoria, labelEstado, labelUrgencia } from '@/lib/supabase';

function TicketDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [me, setMe] = useState<User | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [updates, setUpdates] = useState<TicketUpdate[]>([]);
  const [comment, setComment] = useState('');
  const [newEstado, setNewEstado] = useState<Estado | ''>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('cdc_claudia') === '1') setMe('claudia');
      else if (localStorage.getItem('cdc_rolo') === '1') setMe('rolo');
      else location.href = '/';
    }
  }, []);

  const load = async () => {
    const [tRes, uRes] = await Promise.all([
      supabase.from('cdc_tickets').select('*').eq('id', id).single(),
      supabase.from('cdc_updates').select('*').eq('ticket_id', id).order('created_at', { ascending: true }),
    ]);
    if (tRes.data) setTicket(tRes.data as Ticket);
    setUpdates((uRes.data as TicketUpdate[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!id) return;
    load();
    const ch = supabase
      .channel(`cdc-detail-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cdc_tickets', filter: `id=eq.${id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cdc_updates', filter: `ticket_id=eq.${id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  if (!me || loading) return <div style={{ padding: 40 }}>Cargando…</div>;
  if (!ticket) return (
    <div className="shell">
      <Link href={`/yo?me=${me}`} className="detail-back">← Volver</Link>
      <div className="empty"><div className="emoji">?</div><div className="msg">No existe</div></div>
    </div>
  );

  const cambiarEstado = async (estado: Estado, msg?: string) => {
    const updates: any = { estado, updated_at: new Date().toISOString() };
    if (estado === 'resuelto') updates.resuelto_at = new Date().toISOString();
    await supabase.from('cdc_tickets').update(updates).eq('id', id);
    await supabase.from('cdc_updates').insert({
      ticket_id: id,
      autor: me,
      mensaje: msg || `→ ${labelEstado[estado]}`,
      estado_cambio: estado,
    });
  };

  const enviarComentario = async () => {
    if (!comment.trim() && !newEstado) return;
    const estadoFinal = (newEstado || ticket.estado) as Estado;
    const cambio = newEstado && newEstado !== ticket.estado ? newEstado : null;
    if (cambio) {
      const tUpdates: any = { estado: cambio, updated_at: new Date().toISOString() };
      if (cambio === 'resuelto') tUpdates.resuelto_at = new Date().toISOString();
      await supabase.from('cdc_tickets').update(tUpdates).eq('id', id);
    }
    await supabase.from('cdc_updates').insert({
      ticket_id: id,
      autor: me,
      mensaje: comment.trim() || `→ ${labelEstado[cambio || ticket.estado]}`,
      estado_cambio: cambio,
    });
    setComment('');
    setNewEstado('');
  };

  const cancelar = async () => {
    if (!confirm('¿Cancelar esta cosa?')) return;
    await cambiarEstado('cancelado', 'Cancelado');
  };

  const borrar = async () => {
    if (!confirm('¿Borrar para siempre? No hay vuelta atrás.')) return;
    await supabase.from('cdc_updates').delete().eq('ticket_id', id);
    await supabase.from('cdc_tickets').delete().eq('id', id);
    router.push(`/yo?me=${me}`);
  };

  const puedoAccionar = ticket.to_user === me || ticket.asignado_a === me || ticket.from_user === me;
  const yoLoMande = ticket.from_user === me;
  const esParaMi = ticket.to_user === me || ticket.asignado_a === me;

  return (
    <div className="shell">
      <Link href={`/yo?me=${me}`} className="detail-back">← Volver</Link>

      <div className="detail-head">
        <div className="detail-chips">
          <span className={`t-tag ${ticket.categoria}`}>{labelCategoria[ticket.categoria]}</span>
          {ticket.urgencia === 'urgente' && <span className="t-urgente">Urgente</span>}
          {ticket.urgencia === 'alta' && (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
              padding: '3px 8px', borderRadius: 4, background: 'var(--trabajo-bg)', color: 'var(--trabajo-deep)' }}>Alta</span>
          )}
          <span className={`t-estado ${ticket.estado}`} style={{ marginLeft: 'auto' }}>
            <span className="estado-dot"></span>
            {labelEstado[ticket.estado]}
          </span>
        </div>
        <h1 className="detail-title">{ticket.titulo}</h1>
        {ticket.descripcion && <p className="detail-desc">{ticket.descripcion}</p>}
      </div>

      <div className="detail-info">
        <div className="row">
          <span className="k">De</span>
          <span className="v">{labelUser(ticket.from_user)}</span>
        </div>
        <div className="row">
          <span className="k">Para</span>
          <span className="v">{labelUser(ticket.to_user)}</span>
        </div>
        <div className="row">
          <span className="k">Asignado a</span>
          <span className="v">{labelUser(ticket.asignado_a)}</span>
        </div>
        <div className="row">
          <span className="k">Creado</span>
          <span className="v">{new Date(ticket.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        {ticket.resuelto_at && (
          <div className="row">
            <span className="k">Resuelto</span>
            <span className="v">{new Date(ticket.resuelto_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
      </div>

      {/* ACCIONES RÁPIDAS */}
      {ticket.estado !== 'resuelto' && ticket.estado !== 'cancelado' && puedoAccionar && (
        <div className="action-row">
          {esParaMi && ticket.estado === 'nuevo' && (
            <button className="btn" onClick={() => cambiarEstado('en_progreso', 'Trabajando en esto')}>
              Empezar
            </button>
          )}
          {esParaMi && (ticket.estado === 'nuevo' || ticket.estado === 'en_progreso') && (
            <button className="btn" onClick={() => cambiarEstado('resuelto', 'Hecho ✓')}>
              Marcar hecho
            </button>
          )}
          {esParaMi && ticket.estado === 'en_progreso' && (
            <button className="btn-ghost" onClick={() => cambiarEstado('esperando', 'En pausa')}>
              En pausa
            </button>
          )}
          {yoLoMande && <button className="btn-ghost" onClick={cancelar}>Cancelar</button>}
        </div>
      )}
      {(ticket.estado === 'resuelto' || ticket.estado === 'cancelado') && (
        <div className="action-row">
          <button className="btn-ghost" onClick={() => cambiarEstado('nuevo', 'Reabierto')}>Reabrir</button>
          {yoLoMande && <button className="btn-ghost" onClick={borrar} style={{ color: 'var(--urgent)' }}>Borrar</button>}
        </div>
      )}

      {/* TIMELINE */}
      <h3 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 400, fontSize: 18, color: 'var(--ink-soft)', marginTop: 32, marginBottom: 0 }}>
        Lo que ha pasado
      </h3>
      <div className="timeline">
        {updates.length === 0 ? (
          <div className="tl-entry">
            <div className="tl-msg">Sin actualizaciones todavía</div>
          </div>
        ) : updates.map((u) => (
          <div key={u.id} className={`tl-entry ${u.estado_cambio ? 'change' : ''} ${u.estado_cambio === 'resuelto' ? 'resuelto' : ''}`}>
            <div>
              <span className="tl-autor">{labelUser(u.autor)}</span>
              <span className="tl-when">{new Date(u.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="tl-msg">{u.mensaje}</div>
            {u.estado_cambio && <div className="tl-change">→ {labelEstado[u.estado_cambio]}</div>}
          </div>
        ))}
      </div>

      {/* COMPOSER */}
      {ticket.estado !== 'cancelado' && (
        <div className="composer">
          <textarea
            placeholder="Añadir una actualización, comentario, o nota…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="composer-actions">
            <select value={newEstado} onChange={(e) => setNewEstado(e.target.value as Estado | '')}>
              <option value="">Sin cambiar estado</option>
              {ticket.estado !== 'nuevo' && <option value="nuevo">→ Nuevo</option>}
              {ticket.estado !== 'en_progreso' && <option value="en_progreso">→ En progreso</option>}
              {ticket.estado !== 'esperando' && <option value="esperando">→ Esperando</option>}
              {ticket.estado !== 'resuelto' && <option value="resuelto">→ Resuelto</option>}
            </select>
            <button className="btn" onClick={enviarComentario} disabled={!comment.trim() && !newEstado}>
              Publicar
            </button>
          </div>
        </div>
      )}

      <div className="footer">Hecho por Colmena · 2026</div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Cargando…</div>}>
      <TicketDetail />
    </Suspense>
  );
}
