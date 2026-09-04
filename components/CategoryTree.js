"use client";

import { useState } from "react";

// Componente RECURSIVO: CategoryTree se renderiza a sí mismo por cada
// hijo del nodo actual. El "caso base" es un nodo sin hijos (hijos.length === 0),
// donde simplemente se pinta la hoja y la recursión se detiene.
export default function CategoryTree({ nodo, profundidad = 0 }) {
  const [abierto, setAbierto] = useState(profundidad < 1);
  const tieneHijos = nodo.hijos && nodo.hijos.length > 0;

  return (
    <div style={{ marginLeft: profundidad === 0 ? 0 : 18 }}>
      <button
        onClick={() => tieneHijos && setAbierto(!abierto)}
        className={`flex items-center gap-2 py-1.5 text-left w-full rounded-md px-2 hover:bg-gray-50 ${
          tieneHijos ? "cursor-pointer" : "cursor-default"
        }`}
      >
        {tieneHijos ? (
          <span className="text-gray-400 w-4">{abierto ? "▾" : "▸"}</span>
        ) : (
          <span className="text-gray-300 w-4">•</span>
        )}
        <span className={profundidad === 0 ? "font-bold text-marca" : "text-gray-700"}>
          {nodo.nombre}
        </span>
      </button>

      {/* Caso recursivo: cada hijo dibuja su propio subárbol llamando
          de nuevo a CategoryTree, con profundidad + 1 */}
      {tieneHijos && abierto && (
        <div className="border-l border-gray-200 ml-2">
          {nodo.hijos.map((hijo, i) => (
            <CategoryTree key={i} nodo={hijo} profundidad={profundidad + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
