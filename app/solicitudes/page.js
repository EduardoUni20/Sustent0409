"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import QueuePanel from "@/components/QueuePanel";
import StackPanel from "@/components/StackPanel";

import { clientesIniciales } from "@/data/clients";
import { pedidosIniciales } from "@/data/orders";

import {
  crearCola,
  encolar,
  desencolar,
} from "@/lib/queue";

import {
  crearPila,
  apilar,
  desapilar,
} from "@/lib/stack";

export default function SolicitudesPage() {
  const router = useRouter();

  const [clientes] = useState(clientesIniciales);

  // -------------------------
  // COLA
  // -------------------------

  const [cola, setCola] = useState(() => {
    let nuevaCola = crearCola();

    pedidosIniciales.forEach((pedido) => {
      nuevaCola = encolar(nuevaCola, pedido);
    });

    return nuevaCola;
  });

  // -------------------------
  // PILA
  // -------------------------

  const [pila, setPila] = useState(() => {
    return crearPila();
  });

  // Pedidos atendidos
  const [atendidos, setAtendidos] = useState([]);

  // -------------------------
  // OBTENER CLIENTE
  // -------------------------

  function obtenerCliente(clienteId) {
    return clientes.find(
      (cliente) => cliente.id === clienteId
    );
  }

  // -------------------------
  // ATENDER PEDIDO
  // -------------------------

  function atenderSiguiente() {
    const resultado = desencolar(cola);

    if (!resultado.elemento) {
      return;
    }

    const pedido = resultado.elemento;

    const cliente = obtenerCliente(
      pedido.clienteId
    );

    // Actualizar cola
    setCola(resultado.cola);

    // Agregar pedido a atendidos
    setAtendidos((anteriores) => [
      ...anteriores,
      {
        ...pedido,
        estado: "Atendido",
      },
    ]);

    // Crear operación
    const nuevaOperacion = {
      pedidoId: pedido.id,
      descripcion: `Pedido #${pedido.id} atendido`,
      cliente: cliente?.nombre || "Cliente desconocido",
    };

    // Agregar operación a la pila
    setPila((pilaActual) =>
      apilar(pilaActual, nuevaOperacion)
    );
  }

  // -------------------------
  // DESHACER OPERACIÓN
  // -------------------------

  function deshacerOperacion() {
    const resultado = desapilar(pila);

    if (!resultado.elemento) {
      return;
    }

    const operacion = resultado.elemento;

    setPila(resultado.pila);

    setAtendidos((anteriores) =>
      anteriores.filter(
        (pedido) => pedido.id !== operacion.pedidoId
      )
    );
  }

  // -------------------------
  // PREPARAR ENTREGA
  // -------------------------

  function prepararEntrega(pedido) {
    const cliente = obtenerCliente(
      pedido.clienteId
    );

    if (!cliente) {
      return;
    }

    // Guardamos temporalmente el pedido
    // para que Entregas pueda utilizarlo.
    sessionStorage.setItem(
      "pedidoEntrega",
      JSON.stringify({
        ...pedido,
        cliente: cliente,
      })
    );

    // Ir al módulo de entregas
    router.push("/entregas");
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">

      {/* ENCABEZADO */}

      <div className="mb-8">

        <span className="badge bg-blue-100 text-blue-700">
          PILAS + COLAS
        </span>

        <h1 className="text-3xl font-bold text-marca mt-2">
          Gestión de solicitudes
        </h1>

        <p className="text-gray-600 mt-2">
          Administración de pedidos utilizando estructuras
          de datos FIFO y LIFO.
        </p>

      </div>

      {/* FLUJO */}

      <div className="card mb-6">

        <h2 className="text-lg font-bold text-marca mb-2">
          Flujo del sistema
        </h2>

        <p className="text-sm text-gray-600">
          Los pedidos ingresan a una cola y son atendidos
          según su orden de llegada. Cada operación realizada
          se registra posteriormente en una pila de operaciones
          recientes.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">

          <div className="px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs text-blue-600">
              1
            </p>

            <p className="font-bold text-blue-800">
              Pedido
            </p>
          </div>

          <span className="text-gray-400">
            →
          </span>

          <div className="px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs text-blue-600">
              2
            </p>

            <p className="font-bold text-blue-800">
              Cola FIFO
            </p>
          </div>

          <span className="text-gray-400">
            →
          </span>

          <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200">
            <p className="text-xs text-green-600">
              3
            </p>

            <p className="font-bold text-green-800">
              Atender
            </p>
          </div>

          <span className="text-gray-400">
            →
          </span>

          <div className="px-4 py-3 rounded-lg bg-purple-50 border border-purple-200">
            <p className="text-xs text-purple-600">
              4
            </p>

            <p className="font-bold text-purple-800">
              Pila LIFO
            </p>
          </div>

        </div>

      </div>

      {/* COLA */}

      <QueuePanel
        cola={cola}
        clientes={clientes}
        onAtender={atenderSiguiente}
      />

      {/* PILA */}

      <div className="mt-6">

        <StackPanel
          pila={pila}
          onDeshacer={deshacerOperacion}
        />

      </div>

      {/* ATENDIDOS */}

      <div className="card mt-6">

        <div className="mb-4">

          <h2 className="text-xl font-bold text-marca">
            Solicitudes atendidas
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Los pedidos atendidos pueden pasar al proceso
            de entrega.
          </p>

        </div>

        {atendidos.length === 0 ? (

          <p className="text-gray-500">
            Todavía no se ha atendido ninguna solicitud.
          </p>

        ) : (

          <div className="space-y-3">

            {atendidos.map((pedido) => {

              const cliente = obtenerCliente(
                pedido.clienteId
              );

              return (
                <div
                  key={pedido.id}
                  className="p-4 rounded-xl bg-green-50 border border-green-200"
                >

                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                    <div>

                      <p className="font-bold text-green-800">
                        Pedido #{pedido.id}
                      </p>

                      <p className="text-sm text-green-700">
                        Cliente: {cliente?.nombre}
                      </p>

                      <p className="text-sm text-green-700">
                        Productos: {pedido.productos.join(" • ")}
                      </p>

                      <p className="text-sm text-green-700">
                        Destino: {cliente?.ciudad}
                      </p>

                    </div>

                    <div className="flex items-center gap-3">

                      <span className="badge bg-green-100 text-green-700">
                        Atendido
                      </span>

                      <button
                        onClick={() =>
                          prepararEntrega(pedido)
                        }
                        className="bg-marca text-white rounded-lg px-4 py-2 font-medium hover:opacity-90 transition"
                      >
                        Preparar entrega →
                      </button>

                    </div>

                  </div>

                </div>
              );

            })}

          </div>

        )}

      </div>

    </main>
  );
}