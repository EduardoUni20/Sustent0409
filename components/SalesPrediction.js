"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { historialVentas } from "@/data/salesHistory";

// --- REGRESIÓN LINEAL SIMPLE POR MÍNIMOS CUADRADOS -----------------------
// Buscamos la recta y = m·x + b que mejor se ajusta a los puntos (x, y)
// del historial de ventas, minimizando el error cuadrático total.
//
//        n·Σ(xy) − Σx·Σy
//   m = ───────────────────
//        n·Σ(x²) − (Σx)²
//
//   b = (Σy − m·Σx) / n
function calcularRegresionLineal(puntos) {
  const n = puntos.length;
  const sumaX = puntos.reduce((acc, p) => acc + p.x, 0);
  const sumaY = puntos.reduce((acc, p) => acc + p.unidades, 0);
  const sumaXY = puntos.reduce((acc, p) => acc + p.x * p.unidades, 0);
  const sumaX2 = puntos.reduce((acc, p) => acc + p.x * p.x, 0);

  const m = (n * sumaXY - sumaX * sumaY) / (n * sumaX2 - sumaX * sumaX);
  const b = (sumaY - m * sumaX) / n;

  return { m, b };
}

export default function SalesPrediction() {
  const [mesesFuturos, setMesesFuturos] = useState(3);

  const { m, b } = useMemo(() => calcularRegresionLineal(historialVentas), []);

  const datosGrafica = useMemo(() => {
    const historico = historialVentas.map((punto) => ({
      etiqueta: punto.mes,
      real: punto.unidades,
      tendencia: Math.round(m * punto.x + b),
    }));

    const futuro = [];
    const ultimoX = historialVentas[historialVentas.length - 1].x;
    for (let i = 1; i <= mesesFuturos; i++) {
      const x = ultimoX + i;
      futuro.push({
        etiqueta: `Mes +${i}`,
        prediccion: Math.round(m * x + b),
        tendencia: Math.round(m * x + b),
      });
    }

    return [...historico, ...futuro];
  }, [m, b, mesesFuturos]);

  return (
    <div className="flex flex-col gap-6">
      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-bold text-marca">
            Ventas mensuales de "Camisetas" y proyección
          </h3>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Meses a predecir:</label>
            <select
              value={mesesFuturos}
              onChange={(e) => setMesesFuturos(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
            >
              {[1, 2, 3, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={datosGrafica} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="etiqueta" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="real"
                name="Unidades reales"
                stroke="#111827"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="tendencia"
                name="Línea de regresión / predicción"
                stroke="#e11d48"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card bg-gray-50">
          <h3 className="font-bold text-marca mb-2">Modelo obtenido</h3>
          <p className="text-sm font-mono bg-white border rounded-lg p-3">
            y = {m.toFixed(2)}·x + {b.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            x = número del mes (1 = enero) &nbsp;·&nbsp; y = unidades vendidas
            estimadas. La pendiente positiva ({m.toFixed(2)}) indica que las ventas
            crecen en promedio esa cantidad de unidades cada mes.
          </p>
        </div>
        <div className="card bg-gray-50">
          <h3 className="font-bold text-marca mb-2">Predicción próximos meses</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            {datosGrafica
              .filter((d) => d.prediccion !== undefined)
              .map((d, i) => (
                <li key={i} className="flex justify-between border-b last:border-0 py-1">
                  <span>{d.etiqueta}</span>
                  <span className="font-semibold">{d.prediccion} unidades</span>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
