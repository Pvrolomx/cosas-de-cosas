'use client';
import { useEffect, useState } from 'react';
import { User, labelUser } from '@/lib/supabase';
import ChatApp from './ChatApp';

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
      setErr('PIN incorrecto');
      setPin('');
    }
  };

  if (auth) return <ChatApp me={me} />;

  return (
    <div className="pin-screen">
      <div className="pin-box">
        <h1>Cosas de Cosas</h1>
        <p>{labelUser(me)} — PIN</p>
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
