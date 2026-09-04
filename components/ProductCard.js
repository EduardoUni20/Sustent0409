import { formatoPrecio } from "@/data/products";

// Componente puro y reutilizable: solo recibe un producto y lo pinta.
// Se usa en la vitrina principal de la tienda (app/page.js).
export default function ProductCard({ producto }) {
  return (
    <div className="card flex flex-col gap-2 hover:shadow-md transition-shadow">
      <div className="h-32 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-sm">
        {producto.categoria} · {producto.subcategoria}
      </div>
      <h3 className="font-semibold text-marca">{producto.nombre}</h3>
      <div className="flex items-center justify-between">
        <span className="text-marca-acento font-bold">{formatoPrecio(producto.precio)}</span>
        <span className="badge bg-gray-100 text-gray-600">Stock: {producto.stock}</span>
      </div>
    </div>
  );
}
