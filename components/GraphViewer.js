"use client";

import { useMemo } from "react";

export default function GraphViewer({
  ciudades,
  rutas,
  rutaDijkstra = [],
}) {
  // Posiciones automáticas para las ciudades
  const posiciones = useMemo(() => {
    const centroX = 450;
    const centroY = 250;
    const radio = 190;

    return ciudades.reduce((acc, ciudad, index) => {
      const angulo = (2 * Math.PI * index) / ciudades.length;

      acc[ciudad.id] = {
        x: centroX + radio * Math.cos(angulo),
        y: centroY + radio * Math.sin(angulo),
      };

      return acc;
    }, {});
  }, [ciudades]);

  const rutaContiene = (origen, destino) => {
    for (let i = 0; i < rutaDijkstra.length - 1; i++) {
      const actual = rutaDijkstra[i];
      const siguiente = rutaDijkstra[i + 1];

      if (
        (actual === origen && siguiente === destino) ||
        (actual === destino && siguiente === origen)
      ) {
        return true;
      }
    }

    return false;
  };

  return (
    <div className="card">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-marca">
          Grafo de ciudades
        </h2>

        <p className="text-sm text-gray-600">
          Las ciudades son los vértices y las rutas representan las
          conexiones. El peso de cada conexión corresponde a la distancia
          en kilómetros.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50">
        <svg
          viewBox="0 0 900 500"
          className="w-full min-w-[700px]"
        >
          {/* RUTAS */}
          {rutas.map((ruta, index) => {
            const origen = posiciones[ruta.origen];
            const destino = posiciones[ruta.destino];

            if (!origen || !destino) return null;

            const seleccionada = rutaContiene(
              ruta.origen,
              ruta.destino
            );

            const mitadX = (origen.x + destino.x) / 2;
            const mitadY = (origen.y + destino.y) / 2;

            return (
              <g key={`${ruta.origen}-${ruta.destino}-${index}`}>
                <line
                  x1={origen.x}
                  y1={origen.y}
                  x2={destino.x}
                  y2={destino.y}
                  stroke={seleccionada ? "#16a34a" : "#9ca3af"}
                  strokeWidth={seleccionada ? 5 : 2}
                />

                <rect
                  x={mitadX - 28}
                  y={mitadY - 12}
                  width="56"
                  height="24"
                  rx="8"
                  fill="white"
                  stroke="#d1d5db"
                />

                <text
                  x={mitadX}
                  y={mitadY + 5}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#374151"
                >
                  {ruta.distancia} km
                </text>
              </g>
            );
          })}

          {/* CIUDADES */}
          {ciudades.map((ciudad) => {
            const posicion = posiciones[ciudad.id];

            const perteneceRuta = rutaDijkstra.includes(ciudad.id);

            return (
              <g key={ciudad.id}>
                <circle
                  cx={posicion.x}
                  cy={posicion.y}
                  r="34"
                  fill={perteneceRuta ? "#16a34a" : "#1f2937"}
                  stroke="white"
                  strokeWidth="4"
                />

                <text
                  x={posicion.x}
                  y={posicion.y + 5}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="bold"
                  fill="white"
                >
                  {ciudad.nombre}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* LEYENDA */}
      <div className="flex flex-wrap gap-5 mt-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-gray-800" />
          Ciudad
        </div>

        <div className="flex items-center gap-2">
          <span className="w-8 h-[2px] bg-gray-400" />
          Ruta
        </div>

        <div className="flex items-center gap-2">
          <span className="w-8 h-[4px] bg-green-600" />
          Ruta encontrada por Dijkstra
        </div>
      </div>
    </div>
  );
}