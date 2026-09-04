import CategoryTree from "@/components/CategoryTree";
import { arbolCategorias } from "@/data/categories";

export default function RecursividadPage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-extrabold text-marca">Recursividad</h1>
        <p className="text-gray-600 mt-1 max-w-2xl">
          Una función recursiva es aquella que se llama a sí misma para resolver
          un problema dividiéndolo en subproblemas más pequeños, hasta llegar a
          un <b>caso base</b> que detiene la recursión.
        </p>
      </header>

      <section className="card">
        <h2 className="font-bold text-marca mb-3">1. Árbol de categorías de la tienda</h2>
        <p className="text-sm text-gray-600 mb-4">
          El componente <code className="inline">CategoryTree</code> se renderiza a sí
          mismo por cada subcategoría, sin importar cuántos niveles tenga el árbol.
        </p>
        <CategoryTree nodo={arbolCategorias} />
      </section>
    </div>
  );
}
