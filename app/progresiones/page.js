import InstallmentPlan from "@/components/InstallmentPlan";

export default function ProgresionesPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold text-marca">Progresiones Aritméticas</h1>
        <p className="text-gray-600 mt-1 max-w-2xl">
          Una progresión aritmética es una secuencia de números donde cada término
          se obtiene sumando una diferencia constante (d) al anterior. Aquí la usamos
          para generar un <b>plan de cuotas</b> de pago para financiar una compra.
        </p>
      </header>
      <InstallmentPlan />
    </div>
  );
}
