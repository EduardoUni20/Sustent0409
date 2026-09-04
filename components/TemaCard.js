import Link from "next/link";

// Tarjeta de acceso rápido a cada módulo/tema del proyecto, usada en Inicio.
export default function TemaCard({ href, titulo, descripcion, complejidad, color }) {
  return (
    <Link
      href={href}
      className="card hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col gap-2"
    >
      <span className={`badge w-fit ${color}`}>{complejidad}</span>
      <h3 className="text-lg font-bold text-marca">{titulo}</h3>
      <p className="text-sm text-gray-600">{descripcion}</p>
      <span className="text-sm font-medium text-marca-acento mt-auto">Ver demostración →</span>
    </Link>
  );
}
