"use client";

export default function StackPanel({
  pila,
  onDeshacer,
}) {
  return (
    <div className="card">

      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-marca">
            Operaciones recientes
          </h2>

          <p className="text-sm text-gray-500">
            Las últimas operaciones realizadas se almacenan
            en una pila.
          </p>
        </div>

        <span className="badge bg-purple-100 text-purple-700">
          LIFO
        </span>
      </div>

      {pila.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500">
          No hay operaciones registradas.
        </div>
      ) : (
        <div className="space-y-2">

          {[...pila].reverse().map((operacion, index) => (
            <div
              key={`${operacion.pedidoId}-${index}`}
              className={`p-4 rounded-xl border ${
                index === 0
                  ? "border-purple-300 bg-purple-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >

              <div className="flex justify-between items-center">

                <div>
                  <p className="font-bold text-marca">
                    {operacion.descripcion}
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    {operacion.cliente}
                  </p>
                </div>

                {index === 0 && (
                  <span className="badge bg-purple-100 text-purple-700">
                    TOPE
                  </span>
                )}

              </div>

            </div>
          ))}

        </div>
      )}

      <button
        onClick={onDeshacer}
        disabled={pila.length === 0}
        className="mt-5 w-full bg-purple-700 text-white rounded-lg px-4 py-2.5 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
      >
        Deshacer última operación
      </button>

    </div>
  );
}