import Link from 'next/link';

export default function Home() {
  return (
    <div className="home">
      <h1>Cosas de Cosas</h1>
      <p>¿Quién eres?</p>
      <Link href="/claudia" className="home-btn">
        Claudia
        <span className="sub">Capturar recados</span>
      </Link>
      <Link href="/rolo" className="home-btn">
        Rolo
        <span className="sub">Recibir y ejecutar</span>
      </Link>
      <div className="footer">Hecho por Colmena 2026</div>
    </div>
  );
}
