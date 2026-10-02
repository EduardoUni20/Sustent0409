import SalesPrediction from "@/components/SalesPrediction";

export default function RegresionLinealPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold text-marca">Regresión Lineal</h1>
        <p className="text-gray-600 mt-1 max-w-2xl">
          La regresión lineal encuentra la recta y = mx + b que mejor se ajusta a
          un conjunto de datos históricos, para poder predecir valores futuros.
          Aquí la usamos sobre las ventas mensuales de camisetas para proyectar
          la demanda de los próximos meses.
        </p>
      </header>
      <SalesPrediction />
    </div>
  );
}
