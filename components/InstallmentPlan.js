"use client";

import { useMemo, useState } from "react";
import { products, formatoPrecio } from "@/data/products";

// --- PROGRESIÓN ARITMÉTICA APLICADA A UN PLAN DE CUOTAS -----------------
// aₙ = a₁ + (n - 1) d         término n-ésimo
// Sₙ = (n / 2) · (a₁ + aₙ)    suma de los n términos (debe dar el precio total)
//
// Dado el precio total (P), el número de cuotas (n) y la diferencia (d) disminue la cuota
// entre una cuota y la siguiente, despejamos a₁ de Sₙ = P:
//   P = (n/2)(2a₁ + (n-1)d)  =>  a₁ = P/n - d(n-1)/2
function generarPlanDeCuotas(precioTotal, n, d) {
  const a1 = precioTotal / n - (d * (n - 1)) / 2;

  const cuotas = [];
  for (let k = 1; k <= n; k++) {
    const valor = a1 + (k - 1) * d;
    cuotas.push(Math.round(valor));
  }

  // Ajuste de redondeo: que la suma real sea EXACTAMENTE el precio total,
  // corrigiendo la diferencia (por los decimales) en la última cuota.
  const sumaActual = cuotas.reduce((a, b) => a + b, 0);
  const diferencia = precioTotal - sumaActual;//por los decimales 
  cuotas[cuotas.length - 1] += diferencia;

  return { a1: Math.round(a1), cuotas, an: cuotas[cuotas.length - 1] };
}

export default function InstallmentPlan() {
  const [productoId, setProductoId] = useState(products[4].id); // producto de valor alto
  const [numCuotas, setNumCuotas] = useState(6);
  const [diferencia, setDiferencia] = useState(-8000);

  const producto = products.find((p) => p.id === Number(productoId));

  const plan = useMemo(
    () => generarPlanDeCuotas(producto.precio, numCuotas, diferencia),
    [producto, numCuotas, diferencia]
  );

  const sumaTotal = plan.cuotas.reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="card grid sm:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-600">Producto a financiar</label>
          <select
            value={productoId}
            onChange={(e) => setProductoId(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} — {formatoPrecio(p.precio)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Número de cuotas (n)</label>
          <select
            value={numCuotas}
            onChange={(e) => setNumCuotas(Number(e.target.value))}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            {[3, 6, 9, 12].map((n) => (
              <option key={n} value={n}>{n} cuotas</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">
            Diferencia entre cuotas (d)
          </label>
          <select
            value={diferencia}
            onChange={(e) => setDiferencia(Number(e.target.value))}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value={-8000}>Decreciente (-$8.000 cada cuota)</option>
            <option value={-3000}>Decreciente suave (-$3.000)</option>
            <option value={0}>Cuotas iguales (d = 0)</option>
            <option value={3000}>Creciente suave (+$3.000)</option>
            <option value={8000}>Creciente (+$8.000 cada cuota)</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-bold text-marca mb-3">Tabla de cuotas</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="text-left py-1.5">Cuota</th>
                <th className="text-right py-1.5">Valor (aₖ)</th>
              </tr>
            </thead>
            <tbody>
              {plan.cuotas.map((valor, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1.5">#{i + 1}</td>
                  <td className="py-1.5 text-right font-medium">{formatoPrecio(valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card bg-gray-50 flex flex-col gap-3">
          <h3 className="font-bold text-marca">Verificación con la fórmula</h3>
          <p className="text-sm text-gray-700">
            Precio del producto: <b>{formatoPrecio(producto.precio)}</b>
          </p>
          <p className="text-sm text-gray-700">
            Primera cuota (a₁): <b>{formatoPrecio(plan.a1)}</b> &nbsp;|&nbsp;
            Última cuota (aₙ): <b>{formatoPrecio(plan.an)}</b>
          </p>
          <p className="text-sm text-gray-700 font-mono bg-white border rounded-lg p-3">
            Sₙ = (n/2)·(a₁ + aₙ) = ({numCuotas}/2)·({formatoPrecio(plan.a1)} + {formatoPrecio(plan.an)})
            <br />
            Sₙ = {formatoPrecio(sumaTotal)}
          </p>
          <p className="text-xs text-gray-500">
            La suma de todas las cuotas coincide con el precio total del producto,
            confirmando la fórmula de la progresión aritmética.
          </p>
        </div>
      </div>
    </div>
  );
}
