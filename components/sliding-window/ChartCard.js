import EmptyChart from "./EmptyChart";

export default function ChartCard({ title, children, emptyText, hasData }) {
  return (
    <article className="card">
      <h2 className="font-bold text-gray-900">{title}</h2>
      {hasData ? (
        <div className="mt-4 h-64">{children}</div>
      ) : (
        <EmptyChart>{emptyText}</EmptyChart>
      )}
    </article>
  );
}
