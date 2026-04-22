import Link from 'next/link';

export default function Home() {
  return (
    <div className="home">
      <div className="home-mark">Lo que hay</div>
      <h1 className="home-title">
        cosas <em>de</em><br />cosas
      </h1>
      <p className="home-sub">Los pendientes de nosotros dos, ordenados y visibles.</p>
      <div className="home-choices">
        <Link href="/yo?me=claudia" className="home-btn">
          Soy Claudia
          <span className="arrow">→</span>
        </Link>
        <Link href="/yo?me=rolo" className="home-btn">
          Soy Rolo
          <span className="arrow">→</span>
        </Link>
      </div>
      <div className="footer" style={{ marginTop: 48 }}>Hecho por Colmena · 2026</div>
    </div>
  );
}
