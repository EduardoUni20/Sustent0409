"use client";

import Link from "next/link";
import { useState } from "react";

// Cada tema del proyecto tiene su propia ruta/página, así el jurado
// puede navegar directo al algoritmo que se está sustentando.
const enlaces = [
  { href: "/", texto: "Inicio" },
  { href: "/big-o", texto: "Big O" },
  { href: "/recursividad", texto: "Recursividad" },
  { href: "/progresiones", texto: "Progresiones" },
  { href: "/regresion-lineal", texto: "Regresión Lineal" },
  { href: "/entregas", texto: "Entregas" },
  { href: "/solicitudes", texto: "Solicitudes" },
];

export default function Navbar() {
  const [abierto, setAbierto] = useState(false);

  return (
    <header className="bg-marca text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-lg tracking-tight">
            ModaLab <span className="text-marca-acento">●</span>
          </Link>

          {/* Menú de escritorio */}
          <nav className="hidden md:flex gap-1">
            {enlaces.map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-200 hover:bg-marca-claro hover:text-white transition-colors"
              >
                {enlace.texto}
              </Link>
            ))}
          </nav>

          {/* Botón hamburguesa (móvil) */}
          <button
            onClick={() => setAbierto(!abierto)}
            className="md:hidden p-2 rounded-md hover:bg-marca-claro"
            aria-label="Abrir menú"
          >
            {abierto ? "✕" : "☰"}
          </button>
        </div>

        {/* Menú móvil desplegable */}
        {abierto && (
          <nav className="md:hidden pb-4 flex flex-col gap-1">
            {enlaces.map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                onClick={() => setAbierto(false)}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-200 hover:bg-marca-claro hover:text-white transition-colors"
              >
                {enlace.texto}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
