import { products } from "@/data/products";
import ProductCard from "@/components/ProductCard";
import TemaCard from "@/components/TemaCard";

export default function Inicio() {
  return (
    <div className="flex flex-col gap-12">
      <section className="text-center max-w-2xl mx-auto flex flex-col gap-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-marca">
          ModaLab — Tienda de Ropa
        </h1>
        <p className="text-gray-600">
          Vitrina de una tienda de ropa que además sirve como proyecto académico:
          cada sección del menú demuestra, con datos reales de la tienda, un tema
          distinto: <b>Big O</b>, <b>Recursividad</b>, <b>Progresiones aritméticas</b> y{" "}
          <b>Regresión lineal</b>.
        </p>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TemaCard
          href="/big-o"
          titulo="Big O"
          descripcion="Comparamos búsqueda lineal vs. búsqueda binaria para encontrar un producto por precio."
          complejidad="O(n) vs O(log n)"
          color="bg-blue-50 text-blue-700"
        />
        <TemaCard
          href="/recursividad"
          titulo="Recursividad"
          descripcion="Árbol de categorías y cálculo del total del carrito con combos anidados."
          complejidad="Función que se llama a sí misma"
          color="bg-purple-50 text-purple-700"
        />
        <TemaCard
          href="/progresiones"
          titulo="Progresiones Aritméticas"
          descripcion="Plan de cuotas de pago para financiar una compra, término a término."
          complejidad="aₙ = a₁ + (n−1)d"
          color="bg-amber-50 text-amber-700"
        />
        <TemaCard
          href="/regresion-lineal"
          titulo="Regresión Lineal"
          descripcion="Predicción de ventas futuras de la tienda a partir del historial mensual."
          complejidad="y = mx + b"
          color="bg-emerald-50 text-emerald-700"
        />
      </section>

      <section>
        <h2 className="text-xl font-bold text-marca mb-4">Catálogo de productos</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((producto) => (
            <ProductCard key={producto.id} producto={producto} />
          ))}
        </div>
      </section>
    </div>
  );
}
