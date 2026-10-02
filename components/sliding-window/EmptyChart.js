export default function EmptyChart({ children }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50 text-center text-sm text-gray-500">
      {children}
    </div>
  );
}
