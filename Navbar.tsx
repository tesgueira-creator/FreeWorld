import Link from 'next/link';

export default function Navbar(): JSX.Element {
  return (
    <nav className='flex gap-4 p-4 bg-primary font-bold'>
      <Link href='/dashboard'>Dashboard</Link>
      <Link href='/drivers'>Pilotos</Link>
      <Link href='/teams'>Equipas</Link>
      <Link href='/tracks'>Pistas</Link>
      <Link href='/simulations'>Simulações</Link>
      <Link href='/data'>Dados</Link>
      <Link href='/analysis'>Análises</Link>
      <Link href='/settings'>Configurações</Link>
    </nav>
  );
}