"use client";

import { useEffect, useState } from "react";

import GraphViewer from "@/components/GraphViewer";

import {
  ciudadesIniciales,
  rutasIniciales,
} from "@/data/graph";

import { dijkstra } from "@/lib/dijkstra";
import { calcularCostoEntrega } from "@/lib/deliveryCost";

export default function EntregasPage() {
  const [ciudades] = useState(ciudadesIniciales);
  const [rutas] = useState(rutasIniciales);

  // Pedido que llega desde Solicitudes
  const [pedido, setPedido] = useState(null);

  // Origen de las entregas de ModaLab
  const [origen, setOrigen] = useState("medellin");

  // Destino
  const [destino, setDestino] = useState("bogota");

  const [kmPorLitro, setKmPorLitro] = useState(40);
  const [precioPorLitro, setPrecioPorLitro] = useState(15000);

  const [resultado, setResultado] = useState(null);
  const [costoEntrega, setCostoEntrega] = useState(null);

  // --------------------------------
  // CARGAR PEDIDO DESDE SOLICITUDES
  // --------------------------------

  useEffect(() => {
    const pedidoGuardado =
      sessionStorage.getItem("pedidoEntrega");

    if (!pedidoGuardado) {
      return;
    }

    try {
      const pedidoRecibido =
        JSON.parse(pedidoGuardado);

      setPedido(pedidoRecibido);

      // La ciudad del cliente se convierte
      // automáticamente en el destino.
      if (pedidoRecibido.cliente?.ciudad) {
        setDestino(pedidoRecibido.cliente.ciudad);
      }

      // Ya no necesitamos conservar el pedido
      // en sessionStorage después de cargarlo.
      sessionStorage.removeItem("pedidoEntrega");

    } catch (error) {
      console.error(
        "No se pudo cargar el pedido:",
        error
      );
    }
  }, []);

  // --------------------------------
  // CALCULAR RUTA
  // --------------------------------

  function calcularRuta() {
    if (origen === destino) {
      const resultadoMismoLugar = {
        distancia: 0,
        ruta: [origen],
      };

      setResultado(resultadoMismoLugar);

      setCostoEntrega({
        litros: 0,
        costo: 0,
      });

      return;
    }

    const resultadoDijkstra = dijkstra(
      ciudades,
      rutas,
      origen,
      destino
    );

    setResultado(resultadoDijkstra);

    if (resultadoDijkstra.ruta.length > 0) {
      const costo = calcularCostoEntrega(
        resultadoDijkstra.distancia,
        Number(kmPorLitro),
        Number(precioPorLitro)
      );

      setCostoEntrega(costo);
    } else {
      setCostoEntrega(null);
    }
  }

  // --------------------------------
  // NOMBRE DE CIUDAD
  // --------------------------------

  function obtenerNombreCiudad(id) {
    const ciudad = ciudades.find(
      (ciudad) => ciudad.id === id
    );

    return ciudad?.nombre || id;
  }

  // --------------------------------
  // FORMATO DE DINERO
  // --------------------------------

  function formatoPesos(valor) {
    return valor.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });
  }

  // --------------------------------
  // LIMPIAR ENTREGA
  // --------------------------------

  function limpiarPedido() {
    setPedido(null);
    setResultado(null);
    setCostoEntrega(null);
    setDestino("bogota");
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">

      {/* ENCABEZADO */}

      <div className="mb-8">

        <span className="badge bg-blue-100 text-blue-700">
          GRAFOS + DIJKSTRA
        </span>

        <h1 className="text-3xl font-bold text-marca mt-2">
          Gestión de entregas
        </h1>

        <p className="text-gray-600 mt-2">
          Calcula la ruta más corta y estima el consumo y
          costo de combustible de cada entrega.
        </p>

      </div>

      {/* PEDIDO RECIBIDO */}

      {pedido && (
        <div className="card mb-6 border-2 border-green-200">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>

              <span className="badge bg-green-100 text-green-700">
                PEDIDO PARA ENTREGA
              </span>

              <h2 className="text-xl font-bold text-marca mt-2">
                Pedido #{pedido.id}
              </h2>

              <p className="text-gray-600 mt-1">
                Cliente:{" "}
                <strong>
                  {pedido.cliente?.nombre}
                </strong>
              </p>

              <p className="text-gray-600">
                Destino:{" "}
                <strong>
                  {obtenerNombreCiudad(
                    pedido.cliente?.ciudad
                  )}
                </strong>
              </p>

              <p className="text-gray-600">
                Productos:{" "}
                {pedido.productos?.join(" • ")}
              </p>

              <p className="text-gray-600">
                Total:{" "}
                <strong>
                  {formatoPesos(pedido.total)}
                </strong>
              </p>

            </div>

            <button
              onClick={limpiarPedido}
              className="border border-gray-300 text-gray-700 rounded-lg px-4 py-2 hover:bg-gray-50 transition"
            >
              Quitar pedido
            </button>

          </div>

        </div>
      )}

      {/* CONFIGURACIÓN */}

      <div className="card mb-6">

        <h2 className="text-xl font-bold text-marca mb-4">
          Configurar entrega
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* ORIGEN */}

          <div>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ciudad de origen
            </label>

            <select
              value={origen}
              onChange={(e) => {
                setOrigen(e.target.value);
                setResultado(null);
                setCostoEntrega(null);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
            >
              {ciudades.map((ciudad) => (
                <option
                  key={ciudad.id}
                  value={ciudad.id}
                >
                  {ciudad.nombre}
                </option>
              ))}
            </select>

          </div>

          {/* DESTINO */}

          <div>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ciudad de destino
            </label>

            <select
              value={destino}
              onChange={(e) => {
                setDestino(e.target.value);
                setResultado(null);
                setCostoEntrega(null);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
            >
              {ciudades.map((ciudad) => (
                <option
                  key={ciudad.id}
                  value={ciudad.id}
                >
                  {ciudad.nombre}
                </option>
              ))}
            </select>

          </div>

          {/* RENDIMIENTO */}

          <div>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rendimiento (km/L)
            </label>

            <input
              type="number"
              min="1"
              value={kmPorLitro}
              onChange={(e) => {
                setKmPorLitro(e.target.value);
                setResultado(null);
                setCostoEntrega(null);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />

          </div>

          {/* PRECIO */}

          <div>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio combustible ($/L)
            </label>

            <input
              type="number"
              min="0"
              value={precioPorLitro}
              onChange={(e) => {
                setPrecioPorLitro(e.target.value);
                setResultado(null);
                setCostoEntrega(null);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />

          </div>

        </div>

        {/* BOTÓN */}

        <button
          onClick={calcularRuta}
          className="mt-5 bg-marca text-white rounded-lg px-5 py-2.5 font-medium hover:opacity-90 transition"
        >
          Calcular entrega
        </button>

      </div>

      {/* RESULTADO */}

      {resultado && resultado.ruta.length > 0 && (
        <div className="card mb-6">

          <h2 className="text-xl font-bold text-marca mb-4">
            Resultado de Dijkstra
          </h2>

          {/* RUTA */}

          <div className="bg-gray-50 rounded-xl p-5">

            <p className="text-sm text-gray-500 mb-2">
              Ruta más corta encontrada
            </p>

            <div className="flex flex-wrap items-center gap-2">

              {resultado.ruta.map(
                (ciudadId, index) => (
                  <div
                    key={`${ciudadId}-${index}`}
                    className="flex items-center gap-2"
                  >

                    <span className="font-bold text-marca">
                      {obtenerNombreCiudad(
                        ciudadId
                      )}
                    </span>

                    {index <
                      resultado.ruta.length - 1 && (
                      <span className="text-gray-400">
                        →
                      </span>
                    )}

                  </div>
                )
              )}

            </div>

          </div>

          {/* MÉTRICAS */}

          <div className="grid md:grid-cols-3 gap-4 mt-4">

            <div className="rounded-xl bg-blue-50 p-4">

              <p className="text-sm text-blue-600">
                Distancia
              </p>

              <p className="text-2xl font-bold text-blue-800">
                {resultado.distancia} km
              </p>

            </div>

            <div className="rounded-xl bg-gray-100 p-4">

              <p className="text-sm text-gray-600">
                Rendimiento
              </p>

              <p className="text-2xl font-bold text-gray-800">
                {kmPorLitro} km/L
              </p>

            </div>

            <div className="rounded-xl bg-green-50 p-4">

              <p className="text-sm text-green-600">
                Combustible necesario
              </p>

              <p className="text-2xl font-bold text-green-800">
                {costoEntrega?.litros.toFixed(2)} L
              </p>

            </div>

          </div>

          {/* COSTO */}

          <div className="mt-4 rounded-xl bg-yellow-50 p-5">

            <p className="text-sm text-yellow-700">
              Costo estimado de combustible
            </p>

            <p className="text-3xl font-bold text-yellow-900">
              {formatoPesos(
                costoEntrega?.costo || 0
              )}
            </p>

            <p className="text-sm text-yellow-700 mt-2">
              {costoEntrega?.litros.toFixed(2)} litros ×{" "}
              {formatoPesos(
                Number(precioPorLitro)
              )} por litro
            </p>

          </div>

        </div>
      )}

      {/* GRAFO */}

      <GraphViewer
        ciudades={ciudades}
        rutas={rutas}
        rutaDijkstra={resultado?.ruta || []}
      />

      {/* INFORMACIÓN DEL GRAFO */}

      <div className="grid md:grid-cols-2 gap-6 mt-6">

        {/* CIUDADES */}

        <div className="card">

          <h2 className="text-lg font-bold text-marca mb-4">
            Ciudades
          </h2>

          <div className="space-y-2">

            {ciudades.map((ciudad) => (

              <div
                key={ciudad.id}
                className="flex justify-between items-center p-3 rounded-lg bg-gray-50"
              >

                <span className="font-medium">
                  {ciudad.nombre}
                </span>

                <span className="badge bg-gray-100 text-gray-600">
                  Vértice
                </span>

              </div>

            ))}

          </div>

        </div>

        {/* CONEXIONES */}

        <div className="card">

          <h2 className="text-lg font-bold text-marca mb-4">
            Conexiones del grafo
          </h2>

          <div className="space-y-2 max-h-80 overflow-y-auto">

            {rutas.map((ruta, index) => {

              const origenCiudad =
                ciudades.find(
                  (ciudad) =>
                    ciudad.id === ruta.origen
                );

              const destinoCiudad =
                ciudades.find(
                  (ciudad) =>
                    ciudad.id === ruta.destino
                );

              return (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-gray-50"
                >

                  <div className="flex justify-between">

                    <span className="font-medium">
                      {origenCiudad?.nombre} →{" "}
                      {destinoCiudad?.nombre}
                    </span>

                    <span className="text-marca-acento font-bold">
                      {ruta.distancia} km
                    </span>

                  </div>

                </div>
              );

            })}

          </div>

        </div>

      </div>

    </main>
  );
}