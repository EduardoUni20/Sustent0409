"use client";

import { useMemo, useState } from "react";
import { products, formatoPrecio } from "@/data/products";

// ===============================
// BÚSQUEDA LINEAL O(n)
// ===============================
function busquedaLineal(arregloOrdenado, objetivo) {
  const inicioTiempo = performance.now();
  const traza = [];

  for (let i = 0; i < arregloOrdenado.length; i++) {
    traza.push(i);

    if (arregloOrdenado[i].id === objetivo) {
      const finTiempo = performance.now();
      return {
        encontrado: true,
        indice: i,
        pasos: traza.length,
        traza,
        tiempo: finTiempo - inicioTiempo,
      };
    }
  }

  const finTiempo = performance.now();
  return {
    encontrado: false,
    indice: -1,
    pasos: traza.length,
    traza,
    tiempo: finTiempo - inicioTiempo,
  };
}

// ===============================
// BÚSQUEDA BINARIA O(log n)
// ===============================
function busquedaBinaria(arregloOrdenado, objetivo) {
  const inicioTiempo = performance.now();
  const traza = [];

  let izquierda = 0;
  let derecha = arregloOrdenado.length - 1;

  while (izquierda <= derecha) {
    const medio = Math.floor((izquierda + derecha) / 2);
    traza.push(medio);

    if (arregloOrdenado[medio].id === objetivo) {
      const finTiempo = performance.now();
      return {
        encontrado: true,
        indice: medio,
        pasos: traza.length,
        traza,
        tiempo: finTiempo - inicioTiempo,
      };
    }

    if (arregloOrdenado[medio].id < objetivo) {
      izquierda = medio + 1;
    } else {
      derecha = medio - 1;
    }
  }

  const finTiempo = performance.now();
  return {
    encontrado: false,
    indice: -1,
    pasos: traza.length,
    traza,
    tiempo: finTiempo - inicioTiempo,
  };
}

export default function SearchComparator() {
  const arregloOrdenado = useMemo(
    () => [...products].sort((a, b) => a.id - b.id),
    []
  );

  // Estados para controlar el modo de búsqueda y los valores
  const [modoBusqueda, setModoBusqueda] = useState("select"); // "select" | "manual"
  const [productoIdSelect, setProductoIdSelect] = useState(products[0]?.id || 1);
  const [productoIdInput, setProductoIdInput] = useState("");
  const [resultado, setResultado] = useState(null);

  function ejecutarBusqueda(e) {
    e?.preventDefault();

    const idBuscado =
      modoBusqueda === "select"
        ? Number(productoIdSelect)
        : Number(productoIdInput);

    if (isNaN(idBuscado) || idBuscado <= 0) return;

    const producto = products.find((p) => p.id === idBuscado);
    const lineal = busquedaLineal(arregloOrdenado, idBuscado);
    const binaria = busquedaBinaria(arregloOrdenado, idBuscado);

    setResultado({
      producto,
      lineal,
      binaria,
      n: arregloOrdenado.length,
      objetivo: idBuscado,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* CARD DE BÚSQUEDA CON DOS OPCIONES */}
      <div className="card flex flex-col gap-4">
        {/* PESTAÑAS DE SELECCIÓN DE MODO */}
        <div className="flex gap-2 border-b pb-3">
          <button
            onClick={() => setModoBusqueda("select")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              modoBusqueda === "select"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Seleccionar de la lista
          </button>
          <button
            onClick={() => setModoBusqueda("manual")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              modoBusqueda === "manual"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Escribir ID manualmente
          </button>
        </div>

        {/* FORMULARIO DE BÚSQUEDA */}
        <form
          onSubmit={ejecutarBusqueda}
          className="flex flex-col sm:flex-row gap-3 sm:items-end"
        >
          <div className="flex-1">
            {modoBusqueda === "select" ? (
              <>
                <label className="text-sm font-medium text-gray-600">
                  Elige un producto existente
                </label>
                <select
                  value={productoIdSelect}
                  onChange={(e) => setProductoIdSelect(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      ID {p.id} - {p.nombre}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-gray-600">
                  Ingresa el ID del producto a buscar
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ej. 1, 15, 99..."
                  value={productoIdInput}
                  onChange={(e) => setProductoIdInput(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </>
            )}
          </div>

          <button type="submit" className="btn-primary">
            Buscar Producto
          </button>
        </form>
      </div>

      {/* RESULTADOS */}
      {resultado && (
        <>
          {/* DETALLES DEL PRODUCTO O MENSAJE DE NO ENCONTRADO */}
          {resultado.producto ? (
            <div className="card bg-gray-50 border-l-4 border-gray-800">
              <h3 className="font-bold text-lg mb-2">Producto encontrado</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <p><b>ID:</b> {resultado.producto.id}</p>
                <p><b>Nombre:</b> {resultado.producto.nombre}</p>
                <p><b>Precio:</b> {formatoPrecio(resultado.producto.precio)}</p>
                <p><b>Stock:</b> {resultado.producto.stock}</p>
              </div>
            </div>
          ) : (
            <div className="card bg-amber-50 border-l-4 border-amber-500 text-amber-900">
              <h3 className="font-bold text-lg mb-1">Producto no encontrado</h3>
              <p className="text-sm">
                No existe ningún producto con el <b>ID #{resultado.objetivo}</b>. 
                Los algoritmos recorrieron el arreglo sin hallar coincidencias.
              </p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {/* LINEAL */}
            <div className="card border-l-4 border-blue-500">
              <h3 className="font-bold text-blue-600">
                Búsqueda Lineal O(n)
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Revisa elemento por elemento.
              </p>
              <p className="text-3xl font-bold mt-3">
                {resultado.lineal.pasos}
              </p>
              <p className="text-sm text-gray-500">comparaciones</p>
              <p className="mt-3 text-sm">
                <b>Tiempo:</b> {resultado.lineal.tiempo.toFixed(6)} ms
              </p>
              <p className="text-xs text-gray-500 mt-3 break-all">
                Índices revisados:
                <br />
                {resultado.lineal.traza.join(", ")}
              </p>
            </div>

            {/* BINARIA */}
            <div className="card border-l-4 border-green-500">
              <h3 className="font-bold text-green-600">
                Búsqueda Binaria O(log n)
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Divide el arreglo en mitades.
              </p>
              <p className="text-3xl font-bold mt-3">
                {resultado.binaria.pasos}
              </p>
              <p className="text-sm text-gray-500">comparaciones</p>
              <p className="mt-3 text-sm">
                <b>Tiempo:</b> {resultado.binaria.tiempo.toFixed(6)} ms
              </p>
              <p className="text-xs text-gray-500 mt-3 break-all">
                Índices revisados:
                <br />
                {resultado.binaria.traza.join(", ")}
              </p>
            </div>

            {/* RESUMEN */}
            <div className="card sm:col-span-2 bg-slate-50">
              <h3 className="font-bold mb-2">Comparación teórica</h3>
              <p className="text-sm">
                Para un catálogo con <b>{resultado.n}</b> productos:
              </p>
              <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
                <li>
                  Búsqueda lineal: hasta <b>{resultado.n}</b> comparaciones.
                </li>
                <li>
                  Búsqueda binaria: aproximadamente{" "}
                  <b>{Math.ceil(Math.log2(resultado.n))}</b> comparaciones.
                </li>
              </ul>
              <p className="mt-3 text-sm text-gray-600">
                La búsqueda binaria escala mucho mejor cuando el tamaño del catálogo aumenta.
              </p>
            </div>
          </div>
        </>
      )}

      <TablaCrecimiento />
    </div>
  );
}

// ===============================
// TABLA BIG O
// ===============================
// ===============================
// TABLA BIG O (Corregido)
// ===============================
function TablaCrecimiento() {
  const tamanos = [16, 64, 256, 1024, 4096, 16384];

  return (
    <div className="card overflow-x-auto">
      <h3 className="font-bold mb-3">Crecimiento en el peor caso</h3>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">n</th>
            <th className="py-2">O(n)</th>
            <th className="py-2">O(log n)</th>
          </tr>
        </thead>
        <tbody>
          {tamanos.map((n) => (
            <tr key={n} className="border-b">
              {/* Se agrega "es-CO" para forzar el mismo formato en Server y Client */}
              <td className="py-2">{n.toLocaleString("es-CO")}</td>
              <td className="py-2 text-blue-600">{n.toLocaleString("es-CO")}</td>
              <td className="py-2 text-green-600">
                {Math.ceil(Math.log2(n))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}