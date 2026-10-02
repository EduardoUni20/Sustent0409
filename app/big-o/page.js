import SearchComparator from "@/components/SearchComparator";

export default function BigOPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold text-marca">Big O — Notación de complejidad</h1>
        <p className="text-gray-600 mt-1 max-w-2xl">
          La notación Big O describe cómo crece el <b>tiempo de ejecución</b> de un
          algoritmo a medida que crece el tamaño de la entrada (n). Aquí comparamos
          dos formas de buscar un producto por precio en el catálogo de la tienda.
        </p>
      </header>
      <SearchComparator />
    </div>
  );
}
