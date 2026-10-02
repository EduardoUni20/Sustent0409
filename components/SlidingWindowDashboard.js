"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat("es-CO");
const COLORS = ["#e11d48", "#f59e0b", "#2563eb", "#10b981", "#7c3aed"];

function Metric({ label, value, detail }) {
  return (
    <article className="card">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-gray-900">{value}</p>
      {detail && <p className="mt-1 text-xs text-gray-500">{detail}</p>}
    </article>
  );
}

function EmptyChart({ children }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50 text-center text-sm text-gray-500">
      {children}
    </div>
  );
}

function formatHour(value) {
  return new Date(value).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
  });
}

export default function SlidingWindowDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [loadingAllTransactions, setLoadingAllTransactions] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionPageSize, setTransactionPageSize] = useState(50);
  const [transactionTotal, setTransactionTotal] = useState(0);
  const [transactionTotalPages, setTransactionTotalPages] = useState(0);
  const [recentAnomalyPage, setRecentAnomalyPage] = useState(1);
  const recentAnomalyPageSize = 10;

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo cargar el dashboard.");
      }
      setDashboard(data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async (
    requestedPage = 1,
    append = false,
  ) => {
    setTransactionsLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({
        page: String(requestedPage),
        pageSize: String(transactionPageSize),
      });
      const response = await fetch(`/api/transactions/list?${query}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudieron cargar las transacciones.");
      }
      setTransactions((current) =>
        append ? [...current, ...data.transactions] : data.transactions,
      );
      setTransactionTotal(data.total);
      setTransactionTotalPages(data.totalPages);
      setTransactionPage(requestedPage);
      return data;
    } catch (loadError) {
      setError(loadError.message);
      return null;
    } finally {
      setTransactionsLoading(false);
    }
  }, [transactionPageSize]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    loadTransactions(1, false);
  }, [loadTransactions]);

  async function refreshDashboard() {
    setTransactionPage(1);
    await Promise.all([
      loadDashboard(),
      loadTransactions(1, false),
    ]);
  }

  async function loadAllTransactions() {
    setLoadingAllTransactions(true);
    try {
      let nextPage = transactionPage;
      while (nextPage < transactionTotalPages) {
        const result = await loadTransactions(nextPage + 1, true);
        if (!result) {
          break;
        }
        nextPage = result.page;
      }
    } finally {
      setLoadingAllTransactions(false);
    }
  }

  async function updateStatus(id, status) {
    setUpdatingId(id);
    setError("");
    try {
      const response = await fetch(`/api/anomalies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "No se pudo actualizar la anomalía.");
      }
      await Promise.all([loadDashboard(), loadTransactions(1, false)]);
      setTransactionPage(1);
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setUpdatingId("");
    }
  }

  const periods = dashboard?.periods;
  const totals = dashboard?.totals;
  const statuses = dashboard?.statuses;
  const recentAnomalies = dashboard?.recentAnomalies ?? [];
  const recentAnomalyTotalPages = Math.max(
    1,
    Math.ceil(recentAnomalies.length / recentAnomalyPageSize),
  );
  const safeRecentAnomalyPage = Math.min(recentAnomalyPage, recentAnomalyTotalPages);
  const paginatedRecentAnomalies = recentAnomalies.slice(
    (safeRecentAnomalyPage - 1) * recentAnomalyPageSize,
    safeRecentAnomalyPage * recentAnomalyPageSize,
  );

  useEffect(() => {
    setRecentAnomalyPage(1);
  }, [recentAnomalies.length]);

  if (loading && !dashboard) {
    return <p className="py-16 text-center text-gray-500">Cargando dashboard…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-rose-700">
            ModaLab · Analítica
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-gray-900">
            Detección de anomalías
          </h1>
          <p className="mt-2 max-w-3xl text-gray-600">
            Cada correo tiene su propia ventana. Al recibir una transacción, el
            sistema ordena por fecha, considera las transacciones válidas de los
            últimos segundos y registra <b>POSIBLE_FRAUDE</b> al alcanzar el
            umbral configurado.
          </p>
        </div>
        <button
          className="btn-secondary shrink-0"
          onClick={refreshDashboard}
          disabled={loading || transactionsLoading}
        >
          {loading || transactionsLoading
            ? "Actualizando…"
            : "Actualizar"}
        </button>
      </header>

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      {!dashboard && !error ? (
        <section className="card text-sm text-gray-600">
          No hay estadísticas disponibles todavía. Configura Supabase y ejecuta
          el esquema siguiendo <code className="inline">SUPABASE_SETUP.md</code>.
        </section>
      ) : dashboard ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Transacciones de hoy"
              value={number.format(periods.today.transactions)}
              detail={money.format(periods.today.value)}
            />
            <Metric
              label="Esta semana"
              value={number.format(periods.week.transactions)}
              detail={money.format(periods.week.value)}
            />
            <Metric
              label="Este mes"
              value={number.format(periods.month.transactions)}
              detail={money.format(periods.month.value)}
            />
            <Metric
              label="Anomalías abiertas"
              value={number.format(statuses.open)}
              detail={`${number.format(totals.anomalies)} anomalías registradas`}
            />
            <Metric
              label="Transacciones totales"
              value={number.format(totals.transactions)}
              detail={`${totals.anomalyPercentage}% relacionadas con anomalías · ${number.format(totals.invalidHashes)} hashes inválidos`}
            />
            <Metric
              label="Usuarios afectados"
              value={number.format(totals.affectedUsers)}
              detail={`Promedio ${totals.averagePerUser} transacciones por usuario`}
            />
            <Metric
              label="Valor sospechoso"
              value={money.format(totals.suspiciousValue)}
              detail={`${number.format(totals.newAnomalies)} anomalías nuevas/abiertas`}
            />
            <Metric
              label="Casos revisados / descartados"
              value={`${number.format(statuses.reviewed)} / ${number.format(statuses.discarded)}`}
              detail="Estados de gestión de anomalías"
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <article className="card">
              <h2 className="font-bold text-gray-900">Actividad de la semana</h2>
              {dashboard.weekly.length ? (
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dashboard.weekly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={formatDay} />
                      <YAxis allowDecimals={false} />
                      <Tooltip labelFormatter={formatDay} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="transactions"
                        name="Transacciones"
                        stroke="#2563eb"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="anomalies"
                        name="Anomalías"
                        stroke="#e11d48"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart>Sin actividad registrada aún.</EmptyChart>
              )}
            </article>

            <article className="card">
              <h2 className="font-bold text-gray-900">
                Anomalías por hora · últimas 24 h
              </h2>
              {dashboard.hourly.length ? (
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboard.hourly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" tickFormatter={formatHour} />
                      <YAxis allowDecimals={false} />
                      <Tooltip
                        labelFormatter={formatHour}
                        formatter={(value) => [value, "Anomalías"]}
                      />
                      <Bar dataKey="count" name="Anomalías" fill="#e11d48" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart>No hay anomalías en las últimas 24 horas.</EmptyChart>
              )}
            </article>

            <article className="card">
              <h2 className="font-bold text-gray-900">Métodos de pago</h2>
              {dashboard.paymentMethods.length ? (
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboard.paymentMethods}
                        dataKey="count"
                        nameKey="method"
                        outerRadius={88}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {dashboard.paymentMethods.map((entry, index) => (
                          <Cell
                            key={entry.method}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChart>Sin transacciones para clasificar.</EmptyChart>
              )}
            </article>

            <article className="card">
              <h2 className="font-bold text-gray-900">Usuarios recurrentes</h2>
              {dashboard.recurrentUsers.length ? (
                <ol className="mt-4 divide-y divide-gray-100">
                  {dashboard.recurrentUsers.map((user, index) => (
                    <li
                      key={user.email}
                      className="flex items-center justify-between gap-3 py-3 text-sm"
                    >
                      <span className="truncate">
                        <span className="mr-3 text-gray-400">{index + 1}.</span>
                        {user.email}
                      </span>
                      <span className="badge bg-gray-100 text-gray-700">
                        {number.format(user.count)} transacciones
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyChart>Aún no hay usuarios con más de una transacción.</EmptyChart>
              )}
            </article>
          </section>

          <section className="card">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <h2 className="font-bold text-gray-900">Anomalías recientes</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Línea de tiempo: hora, usuario, transacción, valor y tamaño de
                  la ventana que activó el caso.
                </p>
              </div>
              <span className="text-xs text-gray-500">
                {recentAnomalies.length} registros
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-3 pr-4">Fecha / hora</th>
                    <th className="py-3 pr-4">Usuario</th>
                    <th className="py-3 pr-4">ID transacción</th>
                    <th className="py-3 pr-4">Valor</th>
                    <th className="py-3 pr-4">Ventana</th>
                    <th className="py-3 pr-4">Nivel</th>
                    <th className="py-3 pr-4">Estado</th>
                    <th className="py-3">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedRecentAnomalies.map((anomaly) => (
                    <tr key={anomaly.id}>
                      <td className="whitespace-nowrap py-3 pr-4">
                        {new Date(anomaly.transactionDate).toLocaleString("es-CO")}
                      </td>
                      <td className="py-3 pr-4">{anomaly.email}</td>
                      <td className="py-3 pr-4">{anomaly.idTxn}</td>
                      <td className="whitespace-nowrap py-3 pr-4">
                        {money.format(anomaly.value)}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4">
                        {anomaly.count} tx / {anomaly.windowSeconds} s
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
                              onClick={() => updateStatus(anomaly.id, "reviewed")}
                            >
                              Revisar
                            </button>
                            <button
                              className="text-xs font-semibold text-gray-600 hover:underline disabled:opacity-50"
                              disabled={updatingId === anomaly.id}
                              onClick={() => updateStatus(anomaly.id, "discarded")}
                            >
                              Descartar
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {recentAnomalies.length === 0 && (
                    <tr>
                      <td className="py-10 text-center text-gray-500" colSpan={8}>
                        No se han detectado anomalías.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {recentAnomalies.length > 0 && (
              <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-4 sm:flex-row">
                <p className="text-sm text-gray-500">
                  Página {safeRecentAnomalyPage} de {recentAnomalyTotalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={safeRecentAnomalyPage === 1}
                    onClick={() => setRecentAnomalyPage((page) => Math.max(1, page - 1))}
                  >
                    Anterior
                  </button>
                  <button
                    className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={safeRecentAnomalyPage === recentAnomalyTotalPages}
                    onClick={() => setRecentAnomalyPage((page) => Math.min(recentAnomalyTotalPages, page + 1))}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </section>

        </>
      ) : null}
    </div>
  );
}
