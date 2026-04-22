'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, User, Categoria, Urgencia, labelUser, labelCategoria, descCategoria, iconCategoria, otroUser } from '@/lib/supabase';

function NewTicketForm() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('personal');
  const [urgencia, setUrgencia] = useState<Urgencia>('normal');
  const [destinatario, setDestinatario] = useState<'yo' | 'otro' | 'both'>('otro');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('cdc_claudia') === '1') setMe('claudia');
      else if (localStorage.getItem('cdc_rolo') === '1') setMe('rolo');
      else location.href = '/';
    }
  }, []);

  if (!me) return null;
  const other = otroUser(me);

  const save = async () => {
    if (!titulo.trim()) return;
    setSaving(true);
    const payload = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      categoria,
      urgencia,
      estado: 'nuevo',
      from_user: me,
      to_user: destinatario === 'yo' ? me : other,
      asignado_a: destinatario === 'both' ? null : (destinatario === 'yo' ? me : other),
    };
    const { data, error } = await supabase.from('cdc_tickets').insert(payload).select().single();
    if (error) {
      alert('Error: ' + error.message);
      setSaving(false);
      return;
    }
    // Entrada inicial en timeline
    if (data) {
      await supabase.from('cdc_updates').insert({
        ticket_id: data.id,
        autor: me,
        mensaje: 'Creado',
        estado_cambio: 'nuevo',
      });
    }
    router.push(`/t/${data.id}`);
  };

  return (
    <div className="shell">
      <Link href={`/yo?me=${me}`} className="detail-back">← Volver</Link>

      <h2 className="form-title" style={{ marginTop: 8, marginBottom: 24 }}>
        <span style={{ fontStyle: 'italic', color: 'var(--personal)' }}>Nueva</span> cosa
      </h2>

      <div className="form">
        {/* TÍTULO */}
        <div className="form-group">
          <label className="form-label">¿Qué es?</label>
          <input
            className="form-input title-input"
            placeholder="Ejemplo: Llevar a Villa Magna"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            autoFocus
          />
        </div>

        {/* DESCRIPCIÓN */}
        <div className="form-group">
          <label className="form-label">Detalles (opcional)</label>
          <textarea
            className="form-textarea"
            placeholder="Horarios, detalles, notas, lo que sea…"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>

        {/* CATEGORÍA */}
        <div className="form-group">
          <label className="form-label">Categoría</label>
          <div className="cat-picker">
            {(['personal', 'trabajo', 'repairs'] as Categoria[]).map((c) => (
              <button
                key={c}
                type="button"
                className={`cat-option ${categoria === c ? `sel-${c}` : ''}`}
                onClick={() => setCategoria(c)}
              >
                <span className="icon">{iconCategoria[c]}</span>
                <div className="name">{labelCategoria[c]}</div>
                <div className="hint">{descCategoria[c]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* DESTINATARIO */}
        <div className="form-group">
          <label className="form-label">¿Para quién?</label>
          <div className="to-picker">
            <button type="button" className={`to-option ${destinatario === 'otro' ? 'sel' : ''}`} onClick={() => setDestinatario('otro')}>
              Para {labelUser(other)}
            </button>
            <button type="button" className={`to-option ${destinatario === 'yo' ? 'sel' : ''}`} onClick={() => setDestinatario('yo')}>
              Para mí
            </button>
          </div>
        </div>

        {/* URGENCIA */}
        <div className="form-group">
          <label className="form-label">Urgencia</label>
          <div className="urg-picker">
            {(['baja', 'normal', 'alta', 'urgente'] as Urgencia[]).map((u) => (
              <button
                key={u}
                type="button"
                className={`urg-option ${urgencia === u ? (u === 'urgente' ? 'sel-urgente' : 'sel') : ''}`}
                onClick={() => setUrgencia(u)}
              >
                {u === 'baja' ? 'Baja' : u === 'normal' ? 'Normal' : u === 'alta' ? 'Alta' : 'Urgente'}
              </button>
            ))}
          </div>
        </div>

        {/* ACCIONES */}
        <div className="action-row" style={{ marginTop: 32 }}>
          <Link href={`/yo?me=${me}`} className="btn-ghost" style={{ textAlign: 'center' }}>Cancelar</Link>
          <button className="btn" onClick={save} disabled={!titulo.trim() || saving}>
            {saving ? 'Guardando…' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Cargando…</div>}>
      <NewTicketForm />
    </Suspense>
  );
}
