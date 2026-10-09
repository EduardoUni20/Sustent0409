import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 10;

export default function RecentAnomaliesTable({ anomalies, updatingId, onUpdateStatus }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredAnomalies = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("es");
    return anomalies.filter((anomaly) => {
      const matchesSearch =
        !normalizedSearch ||
        [anomaly.email, anomaly.idTxn]
          .filter(Boolean)
          .some((value) =>
            String(value).toLocaleLowerCase("es").includes(normalizedSearch),
          );
      const matchesType = typeFilter === "all" || anomaly.type === typeFilter;
      const matchesStatus =
        statusFilter === "all" || anomaly.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [anomalies, search, statusFilter, typeFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAnomalies.length / PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);

  const rows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredAnomalies.slice(start, start + PAGE_SIZE);
  }, [filteredAnomalies, safePage]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter]);

  return (
    <section className="card">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-bold text-gray-900">Anomalías recientes</h2>
          <p className="mt-1 text-sm text-gray-500">
            Busca por correo o ID de transacción y combina los filtros de tipo y
            estado.
          </p>
        </div>
        <span className="text-xs text-gray-500">
          {filteredAnomalies.length} de {anomalies.length} registros
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Buscar correo o ID
          <input
            className="rounded-md border border-gray-300 px-3 py-2 font-normal"
            type="search"
            placeholder="usuario@ejemplo.com"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Tipo de anomalía
          <select
            className="rounded-md border border-gray-300 bg-white px-3 py-2 font-normal"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">Todos los tipos</option>
            <option value="HASH_INVALIDO">Hash no coincide</option>
            <option value="POSIBLE_FRAUDE">Transacciones rápidas</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Estado
          <select
            className="rounded-md border border-gray-300 bg-white px-3 py-2 font-normal"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="open">Abiertas</option>
            <option value="reviewed">Revisadas</option>
            <option value="discarded">Descartadas</option>
          </select>
        </label>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b text-xs uppercase text-gray-500">
            <tr>
              <th className="py-3 pr-4">Fecha / hora</th>
              <th className="py-3 pr-4">Usuario</th>
              <th className="py-3 pr-4">ID transacción</th>
              <th className="py-3 pr-4">Valor</th>
              <th className="py-3 pr-4">Motivo</th>
              <th className="py-3 pr-4">Ventana</th>
              <th className="py-3 pr-4">Nivel</th>
              <th className="py-3 pr-4">Estado</th>
              <th className="py-3">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length ? (
              rows.map((anomaly) => (
                <tr key={anomaly.id}>
                  <td className="whitespace-nowrap py-3 pr-4">
                    {new Date(anomaly.transactionDate).toLocaleString("es-CO")}
                  </td>
                  <td className="py-3 pr-4">{anomaly.email}</td>
                  <td className="py-3 pr-4">{anomaly.idTxn}</td>
                  <td className="whitespace-nowrap py-3 pr-4">
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      maximumFractionDigits: 0,
                    }).format(anomaly.value)}
                  </td>
                  <td className="py-3 pr-4">
                    {anomaly.type === "HASH_INVALIDO"
                      ? "Hash no coincide"
                      : "Transacciones rápidas"}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4">
                    {anomaly.count} tx / {anomaly.windowSeconds} s
                    {anomaly.windowSize
                      ? ` · ventana de ${anomaly.windowSize} tx`
                      : ""}
                  </td>
                  <td className="py-3 pr-4 capitalize">{anomaly.level}</td>
                  <td className="py-3 pr-4 capitalize">
                    {anomaly.status === "open" ? "abierta" : anomaly.status}
                  </td>
                  <td className="py-3">
                    {anomaly.status === "open" ? (
                      <div className="flex gap-2">
                        <button
                          className="text-xs font-semibold text-blue-700 hover:underline disabled:opacity-50"
                          disabled={updatingId === anomaly.id}
                          onClick={() => onUpdateStatus(anomaly.id, "reviewed")}
                        >
                          Revisar
                        </button>
                        <button
                          className="text-xs font-semibold text-gray-600 hover:underline disabled:opacity-50"
                          disabled={updatingId === anomaly.id}
                          onClick={() => onUpdateStatus(anomaly.id, "discarded")}
                        >
                          Descartar
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-10 text-center text-gray-500" colSpan={9}>
                  {anomalies.length
                    ? "No hay anomalías que coincidan con los filtros."
                    : "No se han detectado anomalías."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {anomalies.length > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-4 sm:flex-row">
          <p className="text-sm text-gray-500">
            Página {safePage} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={safePage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </button>
            <button
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={safePage === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
