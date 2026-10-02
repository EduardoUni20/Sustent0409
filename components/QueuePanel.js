"use client";

export default function QueuePanel({
  cola,
  clientes,
  onAtender,
}) {
  function obtenerCliente(clienteId) {
    return clientes.find(
      (cliente) => cliente.id === clienteId
    );
  }

  return (
    <div className="card">

      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-marca">
            Cola de solicitudes
          </h2>

          <p className="text-sm text-gray-500">
            Los pedidos se atienden según su orden de llegada.
          </p>
        </div>

        <span className="badge bg-blue-100 text-blue-700">
          FIFO
        </span>
      </div>

      {cola.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500">
          No hay solicitudes pendientes.
        </div>
      ) : (
        <div className="space-y-3">

          {cola.map((pedido, index) => {
            const cliente = obtenerCliente(
              pedido.clienteId
            );

            return (
              <div
                key={pedido.id}
                className={`rounded-xl border p-4 ${
                  index === 0
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >

                <div className="flex items-center justify-between">

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-marca">
                        Pedido #{pedido.id}
                      </span>

                      {index === 0 && (
                        <span className="badge bg-blue-100 text-blue-700">
                          Siguiente
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mt-1">
                      {cliente?.nombre}
                    </p>

                    <p className="text-sm text-gray-500">
                      {pedido.productos.join(" • ")}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-marca-acento">
                      ${pedido.total.toLocaleString("es-CO")}
                    </p>

                    <p className="text-xs text-gray-500">
                      Posición #{index + 1}
                    </p>
                  </div>

                </div>

              </div>
            );
          })}

        </div>
      )}

      <button
        onClick={onAtender}
        disabled={cola.length === 0}
        className="mt-5 w-full bg-marca text-white rounded-lg px-4 py-2.5 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
      >
        Atender siguiente solicitud
      </button>

    </div>
  );
}