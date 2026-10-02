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
import ChartCard from "@/components/sliding-window/ChartCard";
import EmptyChart from "@/components/sliding-window/EmptyChart";
import MetricCard from "@/components/sliding-window/MetricCard";
import RecentAnomaliesTable from "@/components/sliding-window/RecentAnomaliesTable";
import { logAnomalyLifecycle } from "@/lib/slidingWindowDiagnostics";

const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat("es-CO");
const COLORS = ["#e11d48", "#f59e0b", "#2563eb", "#10b981", "#7c3aed"];

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
  const [recurrentUsersPage, setRecurrentUsersPage] = useState(1);
  const recurrentUsersPageSize = 5;

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
      logAnomalyLifecycle("dashboard_loaded", {
        totals: data?.totals,
        anomalies: data?.recentAnomalies?.length ?? 0,
      });
    } catch (loadError) {
      setError(loadError.message);
      logAnomalyLifecycle("dashboard_error", {
        message: loadError.message,
      });
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
      logAnomalyLifecycle("transactions_error", {
        message: loadError.message,
      });
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
      logAnomalyLifecycle("anomaly_status_updated", { id, status });
      await Promise.all([loadDashboard(), loadTransactions(1, false)]);
      setTransactionPage(1);
    } catch (updateError) {
      setError(updateError.message);
      logAnomalyLifecycle("anomaly_status_error", {
        id,
        status,
        message: updateError.message,
      });
    } finally {
      setUpdatingId("");
    }
  }

  const periods = dashboard?.periods;
  const totals = dashboard?.totals;
  const statuses = dashboard?.statuses;
  const recentAnomalies = dashboard?.recentAnomalies ?? [];
  const recurrentUsers = dashboard?.recurrentUsers ?? [];
  const recurrentUsersTotalPages = Math.max(
    1,
    Math.ceil(recurrentUsers.length / recurrentUsersPageSize),
  );
  const safeRecurrentUsersPage = Math.min(
    recurrentUsersPage,
    recurrentUsersTotalPages,
  );
  const paginatedRecurrentUsers = recurrentUsers.slice(
    (safeRecurrentUsersPage - 1) * recurrentUsersPageSize,
    safeRecurrentUsersPage * recurrentUsersPageSize,
  );

  useEffect(() => {
    setRecurrentUsersPage(1);
  }, [recurrentUsers.length]);

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
          {loading || transactionsLoading ? "Actualizando…" : "Actualizar"}
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
            <MetricCard
              label="Transacciones de hoy"
              value={number.format(periods.today.transactions)}
              detail={money.format(periods.today.value)}
            />
            <MetricCard
              label="Esta semana"
              value={number.format(periods.week.transactions)}
              detail={money.format(periods.week.value)}
            />
            <MetricCard
              label="Este mes"
              value={number.format(periods.month.transactions)}
              detail={money.format(periods.month.value)}
            />
            <MetricCard
              label="Anomalías abiertas"
              value={number.format(statuses.open)}
              detail={`${number.format(totals.anomalies)} anomalías registradas`}
            />
            <MetricCard
              label="Transacciones totales"
              value={number.format(totals.transactions)}
              detail={`${totals.anomalyPercentage}% relacionadas con anomalías · ${number.format(totals.invalidHashes)} hashes inválidos`}
            />
            <MetricCard
              label="Usuarios afectados"
              value={number.format(totals.affectedUsers)}
              detail={`Promedio ${totals.averagePerUser} transacciones por usuario`}
            />
            <MetricCard
              label="Valor sospechoso"
              value={money.format(totals.suspiciousValue)}
              detail={`${number.format(totals.newAnomalies)} anomalías nuevas/abiertas`}
            />
            <MetricCard
              label="Casos revisados / descartados"
              value={`${number.format(statuses.reviewed)} / ${number.format(statuses.discarded)}`}
              detail="Estados de gestión de anomalías"
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Actividad de la semana"
              hasData={Boolean(dashboard.weekly.length)}
              emptyText="Sin actividad registrada aún."
            >
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
            </ChartCard>

            <ChartCard
              title="Anomalías por hora · últimas 24 h"
              hasData={Boolean(dashboard.hourly.length)}
              emptyText="No hay anomalías en las últimas 24 horas."
            >
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
            </ChartCard>

            <ChartCard
              title="Métodos de pago"
              hasData={Boolean(dashboard.paymentMethods.length)}
              emptyText="Sin transacciones para clasificar."
            >
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
            </ChartCard>

            <article className="card">
              <h2 className="font-bold text-gray-900">Usuarios recurrentes</h2>
              {recurrentUsers.length ? (
                <>
                  <ol className="mt-4 divide-y divide-gray-100">
                    {paginatedRecurrentUsers.map((user, index) => (
                      <li
                        key={user.email}
                        className="flex items-center justify-between gap-3 py-3 text-sm"
                      >
                        <span className="truncate">
                          <span className="mr-3 text-gray-400">
                            {(safeRecurrentUsersPage - 1) * recurrentUsersPageSize + index + 1}.
                          </span>
                          {user.email}
                        </span>
                        <span className="badge bg-gray-100 text-gray-700">
                          {number.format(user.count)} transacciones
                        </span>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 text-sm text-gray-500">
                    <span>
                      Página {safeRecurrentUsersPage} de {recurrentUsersTotalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={safeRecurrentUsersPage === 1}
                        onClick={() =>
                          setRecurrentUsersPage((page) => Math.max(1, page - 1))
                        }
                      >
                        Anterior
                      </button>
                      <button
                        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={safeRecurrentUsersPage === recurrentUsersTotalPages}
                        onClick={() =>
                          setRecurrentUsersPage((page) =>
                            Math.min(recurrentUsersTotalPages, page + 1),
                          )
                        }
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyChart>Aún no hay usuarios con más de una transacción.</EmptyChart>
              )}
            </article>
          </section>

          <RecentAnomaliesTable
            anomalies={recentAnomalies}
            updatingId={updatingId}
            onUpdateStatus={updateStatus}
          />
        </>
      ) : null}
    </div>
  );
}
