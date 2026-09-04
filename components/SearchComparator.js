"use client";

import { useMemo, useState } from "react";
import { products, formatoPrecio } from "@/data/products";

// --- ALGORITMO 1: Búsqueda lineal — O(n) -------------------------------
// Recorre el arreglo de a uno en uno hasta encontrar el precio buscado.
// En el peor caso revisa TODOS los elementos.
function busquedaLineal(arregloOrdenado, objetivo) {
  const traza = [];
  for (let i = 0; i < arregloOrdenado.length; i++) {
    traza.push(i);
    if (arregloOrdenado[i].precio === objetivo) {
      return { encontrado: true, indice: i, pasos: traza.length, traza };
    }
  }
  return { encontrado: false, indice: -1, pasos: traza.length, traza };
}

// --- ALGORITMO 2: Búsqueda binaria — O(log n) ---------------------------
// Requiere el arreglo ORDENADO. En cada paso descarta la mitad de los
// elementos restantes, por eso crece muchísimo más lento que la lineal.
function busquedaBinaria(arregloOrdenado, objetivo) {
  const traza = [];
  let inicio = 0;
  let fin = arregloOrdenado.length - 1;

  while (inicio <= fin) {
    const medio = Math.floor((inicio + fin) / 2);
    traza.push(medio);
    if (arregloOrdenado[medio].precio === objetivo) {
      return { encontrado: true, indice: medio, pasos: traza.length, traza };
    } else if (arregloOrdenado[medio].precio < objetivo) {
      inicio = medio + 1;
    } else {
      fin = medio - 1;
    }
  }
  return { encontrado: false, indice: -1, pasos: traza.length, traza };
}

export default function SearchComparator() {
  const arregloOrdenado = useMemo(
    //menor a mayor 
    () => [...products].sort((a, b) => a.precio - b.precio),
    []
  );

  const [productoId, setProductoId] = useState(products[0].id);
  const [resultado, setResultado] = useState(null);

  function ejecutarBusqueda() {
    const producto = products.find((p) => p.id === Number(productoId));
    const objetivo = producto.precio;
    const lineal = busquedaLineal(arregloOrdenado, objetivo);
    const binaria = busquedaBinaria(arregloOrdenado, objetivo);
    setResultado({ producto, lineal, binaria, n: arregloOrdenado.length });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-600">
            Elige un producto a buscar por precio
          </label>
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
        <button onClick={ejecutarBusqueda} className="btn-primary">
          Buscar producto
        </button>
      </div>

      {resultado && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="card border-l-4 border-blue-400">
            <h3 className="font-bold text-marca">Búsqueda lineal — O(n)</h3>
            <p className="text-sm text-gray-600 mb-2">
              Revisa los elementos uno por uno desde el inicio.
            </p>
            <p className="text-3xl font-extrabold text-blue-600">
              {resultado.lineal.pasos} <span className="text-base font-medium">pasos</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Índices revisados: {resultado.lineal.traza.join(", ")}
            </p>
          </div>

          <div className="card border-l-4 border-emerald-400">
            <h3 className="font-bold text-marca">Búsqueda binaria — O(log n)</h3>
            <p className="text-sm text-gray-600 mb-2">
              Divide el arreglo ordenado a la mitad en cada paso.
            </p>
            <p className="text-3xl font-extrabold text-emerald-600">
              {resultado.binaria.pasos} <span className="text-base font-medium">pasos</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Índices revisados: {resultado.binaria.traza.join(", ")}
            </p>
          </div>

          <div className="card sm:col-span-2 bg-gray-50">
            <p className="text-sm text-gray-700">
              Con <b>n = {resultado.n}</b> productos, en el peor caso la búsqueda
              lineal necesitaría hasta <b>{resultado.n}</b> comparaciones, mientras
              que la binaria necesita como máximo{" "}
              <b>{Math.ceil(Math.log2(resultado.n))}</b> (⌈log₂ n⌉). La diferencia se
              vuelve enorme a medida que crece el catálogo.
            </p>
          </div>
        </div>
      )}

      <TablaCrecimiento />
    </div>
  );
}

// Tabla de referencia: cómo crecen ambos algoritmos en el PEOR caso
// a medida que aumenta el tamaño del catálogo (n).
function TablaCrecimiento() {
  const tamanos = [16, 64, 256, 1024, 4096, 16384];
  return (
    <div className="card overflow-x-auto">
      <h3 className="font-bold text-marca mb-3">
        Crecimiento en el peor caso (comparaciones máximas)
      </h3>
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="text-gray-500 border-b">
            <th className="py-2 pr-4">n (productos)</th>
            <th className="py-2 pr-4">Lineal O(n)</th>
            <th className="py-2 pr-4">Binaria O(log n)</th>
          </tr>
        </thead>
        <tbody>
          {tamanos.map((n) => (
            <tr key={n} className="border-b last:border-0">
              <td className="py-2 pr-4 font-medium">{n.toLocaleString()}</td>
              <td className="py-2 pr-4 text-blue-600">{n.toLocaleString()}</td>
              <td className="py-2 pr-4 text-emerald-600">{Math.ceil(Math.log2(n))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
