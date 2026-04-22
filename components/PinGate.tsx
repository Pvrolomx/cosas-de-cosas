'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { User, labelUser } from '@/lib/supabase';
import Dashboard from './Dashboard';

const PINS: Record<User, string> = { claudia: '1111', rolo: '2222' };

export default function PinGate({ me }: { me: User }) {
  const [auth, setAuth] = useState(false);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(`cdc_${me}`) === '1') {
      setAuth(true);
    }
  }, [me]);

  const tryPin = () => {
    if (pin === PINS[me]) {
      localStorage.setItem(`cdc_${me}`, '1');
      setAuth(true);
    } else {
      setErr('No es ese');
      setPin('');
    }
  };

  if (auth) return <Dashboard me={me} />;

  return (
    <div className="pin-screen">
      <div className="pin-box">
        <div className="mark">COSAS DE COSAS</div>
        <h1>Hola, <em>{labelUser(me).toLowerCase()}</em></h1>
        <p>Tu PIN, porfa</p>
        <input
          type="tel"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setErr(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') tryPin(); }}
          autoFocus
          placeholder="••••"
        />
        <div className="err">{err}</div>
        <button className="enter-btn" onClick={tryPin}>Entrar</button>
        <Link href="/" className="pin-back">← no soy {labelUser(me).toLowerCase()}</Link>
      </div>
    </div>
  );
}
